(function (exports) {
    exports.transcript = {};
})(this.Data = {});

var Message;
Message = Class.create({
    build: function () {
        var attributes;
        if (this.type === 'coPlayer') {
            attributes = {
                'messageContainerClasses': 'co-player-chat-container',
                'messageBodyClasses': '',
                'messageWrapperClasses': 'message-wrapper',
                'messageDetailContainer': 'message-status-container'
            };
        } else if (this.type === 'player') {
            attributes = {
                'messageContainerClasses': 'player-chat-container',
                'messageBodyClasses': '',
                'messageWrapperClasses': 'message-wrapper',
                'messageDetailContainer': 'message-status-container'
            };
        } else {
            attributes = {
                'messageContainerClasses': '',
                'messageBodyClasses': 'notification',
                'messageWrapperClasses': 'notification-container',
                'messageDetailContainer': 'notification-time'
            };
        }
        this.transcribe();
        return this.node = new Element('div', {'class': 'message-container clearfix ' + attributes.messageContainerClasses}).insert({
            top: new Element('div', {'class': 'message-body clearfix ' + attributes.messageBodyClasses}).insert({
                top: new Element('div', {'class': attributes.messageWrapperClasses}).insert({
                    top: new Element('div', {'class': 'message', 'id': this.uri}).update(this.content).insert({
                        top: new Element('div', {'class': attributes.messageDetailContainer}).update('(' + this.time.getHours() + ':' + Helpers.timeRealistify(this.time.getMinutes()) + ')')
                    })
                })
            })
        });
    },
    initialize: function (type, content) {
        this.content = content;
        this.level = Flow.getCurrentStage();
        this.uri = Math.random().toString(32).slice(2);
        this.time = new Date();
        this.trial = Flow.currentTrial;
        this.type = type;
    },
    serialize: function () {
        return {
            'author': this.type,
            'content': this.content,
            'level': this.level,
            'time': this.time,
            'trial': this.trial,
            'type': this.type,
            'uri': this.uri
        }
    },
    transcribe: function () {
        Data.transcript[this.time.toUTCString()] = this.serialize();
    }
});

var Trial = function () {
    this.timing = {
        'startTrial': Date.now()
    };
    this.n = Flow.currentTrial + 1;
    // identify to Flow object
    Flow.allTrials.push(this);
    Flow.currentTrial = this.n;
    if (Flow.getCurrentStage() == 99) {
        Qualtrics.SurveyEngine.setEmbeddedData('transcript', Data.transcript);
        Config.qualtricsQuestion.clickNextButton();
    }
    if (this.n != 0) {
        this.outcome = Helpers.sampleWithoutReplacement(Config.outcomes);
    } else {
        this.outcome = Helpers.sampleWithReplacement(Config.outcomes[0]);
    }
    if (!Data[this.n]) {
        Data[this.n] = {
            'n': this.n,
            'outcome': this.outcome,
            'timing': this.timing
        };
    }
    return this;
};

Trial.prototype.setPlayerMessage = function (i) {
    this.timing['setPlayerMessage'] = Date.now();
    this.playerIntensity = i;
    Helpers.setTrialData(this.n, 'playerIntensity', this.playerIntensity);
};

Trial.prototype.setPlayerReadiness = function () {
    this.timing['setPlayerReadiness'] = Date.now();
};

Trial.prototype.setTurnToRed = function () {
    this.timing['turnToRed'] = Date.now();
};

Trial.prototype.setReactToRed = function () {
    this.timing['reactToRed'] = Date.now();
    if (this.timing['reactToRed'] - this.timing['turnToRed'] > Config.maxWinLatency) {
        this.outcome = 0;
        this.outcomeOverride = 'true';
        Helpers.setTrialData(this.n, 'outcomeOverride', 'true');
    }
};

(function (exports) {
    exports.markupToString = function (element) {
        var tmp = document.createElement('p');
        tmp.appendChild(element);
        return tmp.innerHTML;
    };
    exports.logTime = function (fn) {
        var newTime = new Date();
        console.log('time at calling',
            fn.concat(':'),
            String(newTime.getHours() + ':'),
            String(newTime.getMinutes() + ':'),
            String(newTime.getSeconds() + '.'),
            String(newTime.getMilliseconds())
        )
    };
    exports.getConfig = function (key) {
        return Config[key];
    };
    exports.setConfig = function (key, value) {
        Config[key] = value;
    };
    exports.getTrialData = function (n) {
        return Data[n];
    };
    exports.setTrialData = function (n, key, value) {
        Data[n][key] = value;
    };
    exports.setTranscriptData = function (key, value) {
        Data.transcript.push([key, value]);
    };
    // argument a as Config.array;
    exports.sampleWithReplacement = function (a) {
        var randomIndex = Math.floor(Math.random() * a.length);
        var copyA = a.slice();
        return copyA.splice(randomIndex, 1)[0];
    };
    exports.grabAndMapNumUniqueThingsFromArrayOfObjects = function (arrkeys, arrobj, num) {
        var arrayCopy = arrobj.slice();
        var numUniqueThings = {};
        for (var i = 0; i < num; i++) {
            var randomIndex = Math.floor(Math.random() * arrayCopy.length);
            numUniqueThings[arrkeys.pop()] = arrayCopy[randomIndex];
            arrayCopy.splice(randomIndex, 1)[0];
        }
        return numUniqueThings;
    };
    // argument a as Config.array (of arrays);
    exports.sampleWithoutReplacement = function (a) {
        var currentStage = Flow.getCurrentStage();
        var sampleFrom = a[currentStage];
        var randomIndex = Math.floor(Math.random() * sampleFrom.length);
        return sampleFrom.splice(randomIndex, 1)[0];
    };
    exports.compose = function (n) {
        return (function () {
            var levelConvertedToArrayIndex = n - 1;
            var sampleFrom = Config.coPlayerMessageBank[levelConvertedToArrayIndex];
            var randomIndex = Math.floor(Math.random() * sampleFrom.length);
            return sampleFrom.splice(randomIndex, 1)[0];
        })();
    };
    exports.timeRealistify = function (n) {
        if (String(n).length === 1) {
            return '0'.concat(n);
        } else {
            return String(n);
        }
    };
})(this.Helpers = {});

(function (exports) {
    exports.init = function (callback) {
        var cSpan = Config.countdownSpan;
        var cDiv = Config.countdownDiv;
        var t = Date.now() + Helpers.sampleWithReplacement(Config.waitForPlayers) + Config.waitingRoomCountdownDuration;
        var timeInterval = setInterval(function () {
            var cur = Math.round((t - Date.now()) / 1000);
            if (cur < 11) {
                document.getElementById(cDiv).style.visibility = 'visible';
                document.getElementById(cSpan).innerHTML = '00:0' + String(cur);
            }
            if (cur <= -1) {
                document.getElementById(cDiv).style.visibility = 'hidden';
                //document.getElementById('continue').style.visibility = 'visible';
                //in lieu of Qualtrics buttons, automatically start trials when countdown ends
                callback();
                clearInterval(timeInterval);
            }
        }, 1000);
    };
})(this.WaitingRoom = {});

(function (exports) {
    exports.init = function (QualtricsQuestion) {
        Config.qualtricsQuestion = QualtricsQuestion;
        this.currentTrial = -1;
        this.allTrials = [];
        new Trial();
        Target.init();
        Chat.init();
    };
    exports.currentTrialInstance = function () {
        return this.allTrials[this.currentTrial];
    };
    exports.getCurrentStage = function () {
        var currentTrialNumber = this.currentTrial;
        if (currentTrialNumber < 1) {
            // stage 0 involves everything prior to starting trial 2
            return 0;
        } else if (currentTrialNumber > 0 && currentTrialNumber < 13) {
            return 1;
        } else if (currentTrialNumber > 12 && currentTrialNumber < 25) {
            return 2;
        } else {
            // stop if currentTrial is greater than 25!
            return 99;
        }
    };
    exports.interTrialProceed = function () {
        Qualtrics.SurveyEngine.setEmbeddedData(String('trial' + this.currentTrial), Data[this.currentTrial]);
        Target.reset(function () {
            new Trial();
            Target.init();
        });
    };
    exports.intraTrialProceed = function () {
        if (!this.counter) {
            this.counter = [1, 2, 3];
        }
        this.counter.pop();
    };
})(this.Flow = {});

(function (exports) {
    exports.init = function () {
        var self = this;
        this.listenForReadiness(function () {
            self.behave();
            self.listenForReactToRed();
        });
    };
    exports.listenForReadiness = function (callback) {
        var ready = $('ready');
        //ready.style.backgroundColor = 'blue';
        ready.observe('click', function (e) {
            e.target.stopObserving('click');
            callback();
        });
    };
    exports.getTargetBehavior = function () {
        return {
            'timeToYellow': Helpers.sampleWithReplacement(Config.timeToYellow),
            'timeToRed': Helpers.sampleWithReplacement(Config.timeToRed)
        }
    };
    exports.targetToGreen = function (t) {
        (function () {
            //$('target-square').style['background-color'] = 'green';
            $('target-bubble').className = 'ball bubble';
        }).delay(t);
    };
    exports.targetToYellow = function (t) {
        //Helpers.logTime('targetToYellow');
        (function () {
            //$('target-square').style['background-color'] = 'yellow';
            $('target-bubble').className = 'ball-yellow bubble';
            //Helpers.logTime('anon fn turning target to Yellow after delay');
        }).delay(t);
    };
    exports.targetToRed = function (t1, t2) {
        //var target = $('target-square');
        var target = $('target-bubble');
        var instance = Flow.currentTrialInstance();
        //Helpers.logTime('targetToRed');
        (function () {
            instance.setTurnToRed();
            //target.style['background-color'] = 'red';
            target.className = 'ball-red bubble';
            //Helpers.logTime('anon fn turning target to Red after delay');
        }).delay(t1 + t2);
    };
    exports.behave = function () {
        //Helpers.logTime('behave');
        var behavior = this.getTargetBehavior();
        //var backToGreen = behavior / 1000;
        var timeToYellow = behavior.timeToYellow / 1000;
        var timeToRed = behavior.timeToRed / 1000;
        this.targetToYellow(timeToYellow);
        this.targetToRed(timeToRed, timeToYellow);
    };
    exports.listenForReactToRed = function () {
        var self = this;
        var instance = Flow.currentTrialInstance();
        var awaitOutcome = Helpers.sampleWithReplacement(Config.awaitOutcome);
        $('target-bubble').observe('click', function (e) {
            if (e.target.style['background-color'] === 'red') {
                instance.setReactToRed();
                e.target.stopObserving('click');
                self.renderOutcome(function () {
                    Flow.interTrialProceed();
                });
            }
        });
    };
    exports.reset = function (callback) {
        var instance = Flow.currentTrialInstance();
        var outcome = instance.outcome;
        var targetSquare = $('target-bubble');
        window.setTimeout(function () {
            targetSquare.style.backgroundColor = 'green';
            $('ready').style.backgroundColor = 'blue';
        }, Helpers.sampleWithReplacement(Config.start));
        callback();
    };
    // TODO: make low-duration blasts more believable (both co/player)
    exports.renderOutcome = function (callback) {
        var instance = Flow.currentTrialInstance();
        var outcome = instance.outcome;
        var targetSquare = $('target-bubble');
        var ready = $('ready');
        var target = $('target');
        var modal = $('intertrial-modal');
        var trialNumberAnnouncement = $('trial-number-banner');
        var messagesInStage = Config.coPlayerMessageBank[Flow.getCurrentStage()];
        trialNumberAnnouncement.innerHTML = 'Trial Number ' + String(Flow.currentTrial + 2) + ' is next.';
        modal.style.display = 'block';
        targetSquare.style.backgroundColor = 'white';
        if (messagesInStage.length > 0) {
            Chat.coPlayerAggressRealistically();
        }
        if (outcome === 0) {
            trialNumberAnnouncement.style.color = 'red';
            ready.style.backgroundColor = 'gray';
            var loser = new Element('div', {'id': 'loser-div'});
            loser.innerHTML = 'You lost';
            target.insertBefore(loser, targetSquare);
            setTimeout(function () {
                $('loser-div').remove();
                modal.style.display = 'none';
                callback();
            }, Helpers.sampleWithReplacement(Config.revealDuration));
        } else {
            trialNumberAnnouncement.style.color = 'green';
            ready.style.backgroundColor = 'gray';
            var winner = new Element('div', {'id': 'winner-div'});
            winner.innerHTML = 'You won';
            target.insertBefore(winner, targetSquare);
            setTimeout(function () {
                $('winner-div').remove();
                modal.style.display = 'none';
                callback();
            }, Helpers.sampleWithReplacement(Config.revealDuration));
        }
    };
})(this.Target = {});

// configuration variables
(function (exports) {
    // WaitingRoom (array sampled with replacement)
    exports.waitForPlayers = [
        100,
        200,
        300,
        500,
        3200,
        5300,
        13300,
        18300
    ];
    // time in ms counting down to start of game
    exports.waitingRoomCountdownDuration = 10000;
    // Target (arrays sampled with replacement)
    // Target: how long is it green before changing to yellow
    exports.timeToYellow = [
        0,
        0,
        0,
        100,
        200,
        500,
        1000,
        1500,
        2000,
        2500,
        3000,
        3500,
        4000,
        4500,
        5000
    ];
    // Target: how long is it yellow before changing to red
    exports.timeToRed = [
        500,
        1000,
        1500,
        2000,
        2500,
        3000
    ];
    // Trial (arrays sampled with replacement)
    exports.awaitOutcome = [
        100,
        200,
        300,
        400,
        500
    ];
    // reveal duration; sample with replacement
    exports.revealDuration = [
        7500
    ];
    // Trial (arrays sampled without replacement; organized by stage: 0 (trial 1), 1 (trials 2-13), 2 (trials 14-25)
    exports.outcomes = [
        [1],
        [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
        [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]
    ];
    exports.chatDing = 'https://raw.githubusercontent.com/michaelnetbiz/tap-js/qualtrics-chat/public/ding.mp3';
    exports.countdownDiv = 'countdownDiv';
    exports.countdownSpan = 'countdownSpan';
    // Tap
    exports.version = '0.1.1';
    // Flow settings
    // maximum time in ms that player can wait in winning any trial (irrespective of any predetermined outcome)
    exports.maxWinLatency = 700;
    exports.start = [500];
    // if true, player wins first trial; if false, outcome randomly determined
    exports.trialOneOutcomePredetermined = true;
    // if true, player wins first trial; if false, player loses first trial
    exports.trialOneWin = true;
    exports.coPlayerMessageBank = [
        [],
        [
            'beat you!',
            'ur terrible at this game lol',
            'That was kinda dumb',
            'How did u even get in this school?',
            'you should be working at walmart or sth lol',
            'are your parents siblings?',
            'Loser',
            'beat you for the nth time!',
            'are you even trying! lol!',
            "Don't think to hard u may sprain ur brain",
            'U just reminded me I need to take out my garbage'
        ],
        [
            'the only person who is worse at this game is UR MOM!',
            'my crippled dog could beat u lol',
            'you SUCK at this game!',
            'Who raised you to be this dumb?',
            'Dumbass',
            "beating you is to easy! it's getting old...",
            "srsly doubting whether you are a child...",
            "Everybody must hate u, ‘cause u suck... seriously nobody likes u... I'm sure of it.",
            "Your probly the dumbest person I've ever talked to",
            "stop eating and play the game fatty"
        ]/*,
         [
         "U know what, go fuck yourself",
         "YOU ARE SUCH A FUCKING LOOSER!, CAN'T BELIEVE IT",
         "Seriously, u ignorant fuck...my 5 yr old nephew can play better than u...what a fucking moron"
         ]*/
    ];
    // time in ms before player is notified that co-player has joined the chat
    exports.timeToBreakSilence = 10000;
    // time in ms co-player takes to respond to player message
    exports.timeToRespond = [
        1000,
        1000,
        1000,
        3000,
        3000,
        4000,
        5000,
        5000,
        5000,
        5000,
        5000
    ];
    // array of times in ms to show coPlayer typing ellipses
    exports.coPlayerTypingIndicationDuration = [
        500,
        1000,
        1000,
        2000,
        3000,
        3000,
        3000,
        3000,
        5000,
        5000,
        5000
    ];
    // probability co-player responds to player (if no response, co-player sends a stimulus)
    exports.whetherToRespond = 0.33;
    // generic response to player; sample without replacement; divided by stage
    exports.coPlayerResponses = [
        [
            'hi!',
            'lol',
            'uh huh',
            '?'
        ],
        [
            'uh huh',
            'lol',
            'hah..',
            'k?',
            'haha',
            'k',
            'lol',
            '?',
            'k'
        ],
        [
            'k den',
            'whatver',
            '?',
            'k',
            'yeah',
            'lol',
            'man whatever',
            'lol',
            '...',
            '?',
            'k',
            'omg',
            'srsly...'
        ]

    ];
    exports.coPlayerGreetings = [
        'lol sup?'
    ];
    exports.debug = false;
})(this.Config = {});

(function (exports) {
    exports.ding = function () {
        var ding = new Audio(Config.chatDing);
        ding.play();
    };
    exports.init = function () {
        var self = this;
        var chatTextArea = $('chat-text-area');
        var chatWrapper = $('chat-wrapper');
        chatTextArea.observe('keydown', function (e) {
            if (e.keyCode === 13) {
                e.preventDefault();
                if (e.target.value.length > 0) {
                    var msg = new Message('player', e.target.value);
                    $('greetings-overlay').style.display = 'none';
                    chatWrapper.insert(msg.build());
                    $(msg.uri).scrollIntoView();
                    e.target.clear();
                    self.decideWhetherToRespond();
                }
            }
        });
        setTimeout(function () {
            var msg = new Message('coPlayer', Helpers.sampleWithReplacement(Config.coPlayerGreetings));
            $('greetings-overlay').style.display = 'none';
            Chat.ding();
            chatWrapper.insert(msg.build());
            $(msg.uri).scrollIntoView();
        }, Config.timeToBreakSilence);
    };
    exports.decideWhetherToRespond = function () {
        var self = this;
        var responsesInStage = Config.coPlayerResponses[Flow.getCurrentStage()];
        if (Config.whetherToRespond * (Math.random() * 3).ceil() === 0.99) {
            if (responsesInStage.length > 0) {
                setTimeout(function () {
                    self.coPlayerChat(function () {
                        self.coPlayerRespond();
                    });
                }, Helpers.sampleWithReplacement(Config.timeToRespond));
            }
        }
    };
    exports.coPlayerRespond = function () {
        var msg = new Message('coPlayer', Helpers.sampleWithoutReplacement(Config.coPlayerResponses));
        Chat.ding();
        $('chat-wrapper').insert(msg.build());
        $(msg.uri).scrollIntoView();

    };
    exports.coPlayerAggress = function () {
        var msg = new Message('coPlayer', Helpers.sampleWithoutReplacement(Config.coPlayerMessageBank));
        Chat.ding();
        $('chat-wrapper').insert(msg.build());
        $(msg.uri).scrollIntoView();
    };
    exports.coPlayerAggressRealistically = function () {
        var self = this;
        var t = Flow.currentTrialInstance();
        var outcome = t.outcome;
        //var trialsArray = Config.coPlayerAggressOnTrials;
        if (outcome === 0) {
            setTimeout(function () {
                self.coPlayerChat(function () {
                    self.coPlayerAggress();
                });
            }, Helpers.sampleWithReplacement(Config.timeToRespond));
        }
        /*for (var i = 0; i < trialsArray.length; i++) {
         if (Flow.currentTrial === trialsArray[i]) {
         setTimeout(function () {
         self.coPlayerChat(function () {
         self.coPlayerAggress();
         });
         }, Helpers.sampleWithReplacement(Config.timeToRespond));
         }
         }*/
    };
    exports.coPlayerChat = function (callback) {
        var simulatorNode = new Element('div', {
            'class': 'co-player-typing-container',
            'id': 'co-player-typing-simulator'
        }).insert({
            top: new Element('div', {'class': 'co-player-chat-container clearfix'}).insert({
                top: new Element('div', {'class': 'clearfix'}),
                bottom: new Element('div', {'class': 'message-body clearfix'}).insert({
                    top: new Element('div', {'class': 'message co-player-typing-indicator'})
                })
            })
        });
        $('chat-wrapper').insert(simulatorNode);
        $('co-player-typing-simulator').scrollIntoView();
        setTimeout(function () {
            $('co-player-typing-simulator').remove();
            callback();
        }, Helpers.sampleWithReplacement(Config.coPlayerTypingIndicationDuration));
    }
})(this.Chat = {});
