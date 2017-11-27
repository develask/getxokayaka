document.onreadystatechange = function () {
    if (document.readyState == "complete") {
        var past=0;
        var other = $("<div></div>");
        function to_first(cols){
            $("#col_first > div.thumbnail").each(function(ind2, first){
                other.append(first);
            });
            $("#col_second > div.thumbnail").each(function(ind,second){
                other.find("div.thumbnail").each(function(ind2, first){
                    if ($(second).attr("date") > $(first).attr("date")){
                        $(second).insertBefore(first);
                        return false;
                    }else if( ind2 ==  $("#col_first > div.thumbnail").length -1){
                        $("#col_first").append(second);
                    }
                });
            });
            $("#col_third > div.thumbnail").each(function(ind, el){
                other.find("div.thumbnail").each(function(ind2, el2){
                    if ($(el).attr("date") > $(el2).attr("date")){
                        $(el).insertBefore(el2);
                        return false;
                    }else if( ind2 ==  $("#col_first > div.thumbnail").length -1){
                        $("#col_first").append(el);
                    }
                });
            });
            if (cols != 1){
                other.find("div.thumbnail").each(function(i,el){
                    var col1 = $("#col_first");
                    var col2 = $("#col_second");
                    var col3 = $("#col_third");
                    var sizes = [col1.height(), col2.height(), col3.height()];
                    var col = [col1, col2, col3];
                    sizes.length = cols;
                    col[sizes.indexOf(Math.min.apply(Math, sizes))].append(el);
                });
            }
        }
        function org_col() {
            var size1 = 768;
            var size2 = 992;
            var current = $( window ).width();
            if (current < size1 && past != 1 ){
                to_first(1);
                past = 1;
            }else{
                if (current < size2 && current >= size1 && past != 2){
                    to_first(2);
                    past= 2;
                }else if(current >= size2 && past != 3){
                    to_first(3);
                    past=3;
                }
            }
        }
        $( window ).resize(org_col);
        org_col.call();
    }
}