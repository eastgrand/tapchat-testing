var imagesArray = ["steven.png", "omar.png", "dani.png", "ida.png", "isaac.png", "colette.png", "jiro.png"];
var namesArray = ["Steven", "Omar", "Dani", "Ida", "Isaac", "Colette", "Jiro"];

function displayProfile(){
    var num = Math.floor(Math.random() * 7);
    document.getElementById("profiletoggle").style.backgroundImage = "url('http://focus26.com/mockups/tapchat/3/" + imagesArray[num] + "')";
    document.getElementById("playername").textContent = namesArray[num];
}