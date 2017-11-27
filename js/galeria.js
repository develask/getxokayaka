function Flickr(api_key){
    this.api_key=api_key;
    
}
Flickr.prototype.info = function(id, callback){
    return $.get(
        "https://api.flickr.com/services/rest/?method=flickr.photos.getSizes&api_key="+this.api_key+"&photo_id="+id+"&format=json&nojsoncallback=1"
    );
}
Flickr.prototype.load = function(cb){
    var that = this;
    var ids = $("#fotos").find("img").map(function(index,dom){return that.info(dom.id)}).get();
    Promise.all(ids).then(function(values){
        var items = [];
        for(el in values){
            var video = {source: undefined, width: 0};
            var item = undefined;
            for(el2 in values[el].sizes.size){
                if (values[el].sizes.size[el2].label == "Original"){
                    item = {
                        src: values[el].sizes.size[el2].source,
                        w: parseInt(values[el].sizes.size[el2].width),
                        h: parseInt(values[el].sizes.size[el2].height)
                    };
                }else if (values[el].sizes.size[el2].media == "video"){
                    video.width = values[el].sizes.size[el2].width;
                    video.source = values[el].sizes.size[el2].source;
                }
            }
            if (video.source != undefined){
                var img = $("#fotos").find("img").eq(el);
                img.after( "<span class='ico'></span>" );
                item = {
                    html: '<div class="wrapper"><div class="video-wrapper"><video width="'+video.width+'" class="pswp__video" src="'+video.source+'" controls></video></div></div>'
                }
            }
            items.push(item);
        }
        that.items = items;
        cb(items);
    }, function(err){
        console.log("Error:");
        console.log(err);
    });
}
var loadImage = function (index){console.log("try to load img: "+index);}
document.onreadystatechange = function () {
    if (document.readyState == "complete") {
        fl = new Flickr("a2a5ae558fc0a9115e095887f08c084b");
        fl.load(function(items){
            loadImage = function(index){
                var pswpElement = $('.pswp').get(0);
                var options = { index: index };
                var gallery = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, items, options);
                gallery.init();
            }
        });
    }
}