$(window).scroll(function() {
    var dist = $(window).scrollTop();
    $("#k11").css("background-position", "-"+(dist)+"px 50px");
    $("#k12").css("background-position", "-"+(dist*1.2)+"px 50px");
    $("#k13").css("background-position", "-"+(dist*0.8)+"px 50px");
    $("#k14").css("background-position", "-"+(dist*0.9)+"px 50px");
    $("#k15").css("background-position", "-"+(dist*0.7)+"px 50px");
    $("#k21").css("background-position", "-"+(dist*1.5)+"px 50px");
    $("#k22").css("background-position", "-"+(dist*1.3)+"px 50px");
    $("#c11").css("background-position", "-"+(dist*0.9)+"px 50px");
    $("#c21").css("background-position", "-"+(dist*1.1)+"px 50px");
});