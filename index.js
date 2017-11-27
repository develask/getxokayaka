var http = require('http');
var fs=require("fs");
var jade = require('jade');
var Url = require("url");
var mongo = require("mongo.js");
var mail = require('mail.js');
var querystring = require('querystring');

function error(res, hizkuntza, code, path){
    fs.readFile("error.jade", 'utf8', function (err, data) {
        if (err) {
            res.writeHead(500);
            res.end("500 - Big Internal error");
        }else{
            options={};
            locals={
                errCode: code,
                hizkuntza: hizkuntza,
                path: path || "",
            };
            var fn = jade.compile(data, options);
            var html = fn(locals);
            res.writeHead(code, {'Content-Type': "text/html"});
            res.write(html);
            res.end();
        }
    });
}
var sessions = {};
function parseCookies (request) {
    var list = {},
        rc = request.headers.cookie;

    rc && rc.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}
function getParams(req){
    var params = req.url;
    params = params.split("?");
    if (params.length >= 2){
        var p = params[1].split("&");
        var ob = {};
        for (el in p){
            var uno = p[el].split("=");
            ob[uno[0]] = uno[1];
        }
        return ob;
    }else{
        return {};
    }
}
// server function
http.createServer(function (req, res) {
    var url = Url.parse(req.url, true);
    var hizkuntza = url.pathname.split("/")[1];//fitxategi estatikoen katalogo izan daiteke
    if (hizkuntza == "eu" || hizkuntza == "es"){
            //sarrera
            var agent= req.headers['user-agent']; // User Agent we get from headers
            var referrer= req.headers['referrer']; //  Likewise for referrer
            var ip= req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            if (!/[Bb][Oo][Tt]/.test(agent)){
                var log = fs.createWriteStream('log.txt', {'flags': 'a'});
                    // use {'flags': 'a'} to append and {'flags': 'w'} to erase and write a new file
                log.end(Date.now()+"\t"+url.pathname+"\t"+agent+"\t"+referrer+"\t"+ip+"\n");
            }
            fs.readFile("index.jade", 'utf8', function (err, data) {
                if (err) {
                    error(res, hizkuntza, 500);
                }else{
                    try{
                        options={
                            filename: __dirname + '/index.jade'
                        };
                        locals={
                            hizkuntza: hizkuntza,
                            path: url.pathname.substr(3),
                            toDateString: function(n, hiz){
                                var d = new Date(n);
                                var meses = {
                                    "es": ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
                                    "eu": ["Urtarrilaren", "Otsailaren", "Martxoaren", "Apirilaren", "Maiatzaren", "Ekainaren", "Uztailaren", "Abuztuaren",  "Irailaren", "Urriaren", "Azaroaren", "Abenduaren"]
                                }
                                if (hiz == "es"){
                                    return d.getDate() + " de " + meses[hiz][d.getMonth()] + " " + d.getFullYear();
                                }else{
                                    return d.getFullYear()+"ko " + meses[hiz][d.getMonth()] +" "+d.getDate()+"a";
                                }
                            }
                        };
                        function ending(err, datos){
                            if (err){
                                error(res, hizkuntza, 500);
                            }else{
                                locals["data"] = datos;
                                var fn = jade.compile(data, options);
                                var html = fn(locals);
                                res.writeHead(200, {'Content-Type': "text/html"});
                                res.write(html);
                                res.end();
                            }
                        }
                        switch(locals.path.split("/")[1]){
                            case "":
                                if (url.query.bilaketa){
                                        mongo.bilaketa(hizkuntza, url.query.bilaketa, url.query.page , function(err, d){
                                            if (err) error(res, hizkuntza, 500);
                                            d.bilaketa = url.query.bilaketa;
                                            ending(err,d);
                                        });
                                    }else{
                                        mongo.inicio(hizkuntza,ending);
                                    }
                            break;
                            case "berriak":
                                if (locals.path.split("/")[2] && locals.path.split("/")[2] != ""){
                                    mongo.findOne(hizkuntza, locals.path.split("/")[2], "noticias", function(err, data){
                                        if (!data){
                                            error(res, hizkuntza, 404);
                                        }else{
                                            ending(err, data);
                                        }
                                    });
                                }else{
                                    mongo.count(hizkuntza,"noticias", "", function(err, count){
                                        if (err){
                                            error(res, hizkuntza, 500);
                                        }else {
                                            mongo.find("", {"limit": 9, "collection": "noticias", hizkuntza: hizkuntza, "skip": ((url.query.page || 1) -1)*9},function (err, data){
                                                if (err){
                                                    error(res, hizkuntza, 500);
                                                }else{
                                                    data.pages = parseInt((parseInt(count)-1)/9)+1;
                                                    data.page = url.query.page>=1?url.query.page:1;
                                                    ending(err, data);
                                                }
                                            });
                                        }
                                    });
                                }
                            break;
                            case "jarduerak":
                                if (locals.path.split("/")[2] && locals.path.split("/")[2] != ""){
                                    mongo.findOne(hizkuntza, locals.path.split("/")[2], "actividades", function(err, data){
                                        if (!data){
                                            error(res, hizkuntza, 404);
                                        }else{
                                            ending(err, data);
                                        }
                                    });
                                }else{
                                    mongo.count(hizkuntza,"actividades", "", function(err, count){
                                        if (err){
                                            error(res, hizkuntza, 500);
                                        }else {
                                            mongo.find("", {"limit": 9, "collection": "actividades", hizkuntza: hizkuntza, "skip": ((url.query.page || 1) -1)*9},function (err, data){
                                                if (err){
                                                    error(res, hizkuntza, 500);
                                                }else{
                                                    data.pages = parseInt((parseInt(count)-1)/9)+1;
                                                    data.page = url.query.page>=1?url.query.page:1;
                                                    ending(err, data);
                                                }
                                            });
                                        }
                                    });
                                }
                            break;
                            case "kluba":
                                fs.readFile("club/"+locals.path.split("/")[2]+"_"+hizkuntza+".html", function(err, data){
                                    if (err){
                                        error(res, hizkuntza, 404);
                                    }else{
                                        res.writeHead(200, {'Content-Type': "text/html"});
                                        res.end(data);
                                    }
                                });
                            break;
                            case "galeria":
                                if (url.query.id){
                                    mongo.flickr.api.photosets.getPhotos(url.query.id,{
                                        page: url.query.page || 1,
                                    }, function(data){
                                        if (data['stat']=='ok'){
                                            data.id = url.query.id;
                                            ending(err, data);
                                        }else{
                                            error(res, hizkuntza, 404);
                                        }
                                    });
                                }else{
                                    mongo.flickr.api.photosets.getList({user_id: "124698999@N02"}, function(data){
                                        if (data['stat']=='ok'){
                                            ending(err, data);
                                        }else{
                                            error(res, hizkuntza, 500);
                                        }
                                    });
                                }
                            break;
                            case "mail":
                                if (req.method == 'POST'){
                                    var body = "";
                                    req.on('data', function(data){ body += data; });
                                    req.on('end', function(){
                                        var datos = querystring.parse(body);
                                        var mailOptions = {
                                            subject: "(WEB) " + datos.asunto, // Subject line
                                            html: "<div style='border: 5px solid black; padding: 1em; width: calc(100% - 4em); margin: 1em;'><p><b>Nombre: </b>" + datos.nombre + "</p><p><b>Email: </b><a href='mailto:"+datos.email+"'>" + datos.email + "</a></p><p><b>Telefono: </b>" + datos.telefono + "</p><p><b>Asunto: </b>" + datos.asunto + "</p></div><div style='padding: 2em; width: calc(100% - 4em);'>" + datos.msg + "</div>"
                                        };
                                        mail.sendMail(mailOptions, function(err, welldone){
                                            if (err){
                                                res.writeHead(500);
                                                res.end("We cannot send the e-mail");
                                            }else{
                                                res.writeHead(200);
                                                res.end("Mail sent");
                                            }
                                        });
                                    });
                                }else{
                                    res.writeHead(500);
                                    res.end("Require POST method");
                                }
                            break;
                            case "login":
                                ending(undefined, {});
                            break;
                            default:
                                if (!locals.path.split("/")[1]){
                                    if (url.query.bilaketa){
                                        mongo.bilaketa(hizkuntza, url.query.bilaketa, url.query.page , function(err, d){
                                            if (err) error(res, hizkuntza, 500);
                                            d.bilaketa = url.query.bilaketa;
                                            ending(err,d);
                                        });
                                    }else{
                                        mongo.inicio(hizkuntza,ending);
                                    }
                                }else{
                                    error(res, hizkuntza, 404);
                                }
                        }
                    }catch(e){
                        console.log(e);
                        error(res, hizkuntza, 404, url.pathname.substr(3));
                    }
                }
            });
    }else if (hizkuntza == "edit"){
        var cook = req.headers.cookie;
        var user;
        if (cook){
            var k = parseCookies(req)['session'];
            user = sessions[k];
        }
        if (!user){
            if (req.method == 'POST'){
                    // komprobatu
                    var body = "";
                    req.on('data', function(data){ body += data; });
                    req.on('end', function(){
                        body = body.split('&');
                        var ob = {};
                        for (var ind in body){
                            var bestea = body[ind].split('=');
                            ob[bestea[0]] = bestea[1];
                        }
                        mongo.user(ob['name'], ob['pass'], function (err, data){
                            if (err || !data){
                                res.writeHead(302, {"Location": "/login"});
                                res.end("Error!");
                            }else{
                                var ccoo = mongo.encode(ob['name']);
                                sessions[ccoo] = ob['name'];
                                res.writeHead(302, {
                                    'Set-Cookie': 'session='+ccoo,
                                    'Content-Type': 'text/plain',
                                    'Location': '/edit/'
                                });
                                res.end("signed");
                            }
                        });
                    });
            }else{
                res.writeHead(302, {"Location": "/login"});
                res.end("Error!");
            }
        }else{
            function editando(que,datos){
                fs.readFile("login/edit.jade", 'utf8', function (err, data) {
                    if (err) {
                        res.writeHead(500);
                        res.end("500 - Big Internal error");
                    }else{
                        mongo.collectEditInfo(function(err,todo){
                            if (err) {
                                res.writeHead(500);
                                res.end("500 - Big Internal error");
                            }else{
                                options={};
                                locals={
                                    name: user,
                                    todo: todo,
                                    datos: datos,
                                    que: que
                                };
                                var fn = jade.compile(data, options);
                                var html = fn(locals);
                                res.writeHead(200, {'Content-Type': "text/html"});
                                res.write(html);
                                res.end();
                            }
                        });
                    }
                });
            }
            switch (url.pathname.split("/")[2]){
                case "":
                    editando();
                break;
                case "noticia":
                    var p = getParams(req);
                    if (p['id']){
                        if (req.method == "POST"){
                            var body = "";
                            req.on('data', function(data){ body += data; });
                            req.on('end', function(){
                                body = querystring.parse(body);
                                var tags = body['tags[]'];
                                if (tags) {
                                    body['tags'] = tags;
                                    delete body['tags[]'];
                                }
                                var users = body['users[]'];
                                if (users) {
                                    body['users'] = users;
                                    delete body['users[]'];
                                }
                                if (typeof body['users'] == "string") body['users'] = [body['users']];
                                if (body['users'].indexOf(user) == -1){
                                    body['users'].push(user);
                                }
                                body['date'] = parseInt(body['date']);
                                if (typeof body['tags'] == "string") body['tags'] = [body['tags']];
                                mongo.update(p['id'], "noticias", body, function(err, data){
                                    if (err){
                                        res.end("ERROR");
                                    }else{
                                        res.end("ACTUALIZADO");
                                    }
                                });
                            });
                        }else if (req.method == "DELETE"){
                            mongo.remove(p['id'], "noticias", function(err){
                                if (err){
                                    res.end("ERROR");
                                }else{
                                    res.end("BORRADO");
                                }
                            });
                        }else{
                            mongo.findOne('es', p['id'], 'noticias', function(err, datos1){
                                 mongo.findOne('eu', p['id'], 'noticias', function(err, datos2){
                                     datos1['title_eu'] = datos2['title_eu'];
                                     datos1['html_eu'] = datos2['html_eu'];
                                     editando('noticias', datos1);
                                 });
                            });
                        }
                    }else if (url.pathname.split("/")[3] == "nueva"){
                        if (req.method == "POST"){
                            var body = "";
                            req.on('data', function(data){ body += data; });
                            req.on('end', function(){
                                body = querystring.parse(body);
                                var tags = body['tags[]'];
                                if (tags) {
                                    body['tags'] = tags;
                                    delete body['tags[]'];
                                }
                                var users = body['users[]'];
                                if (users) {
                                    body['users'] = users;
                                    delete body['users[]'];
                                }
                                body['users'] = [user];
                                body['date'] = parseInt(body['date']);
                                if (typeof body['tags'] == "string") body['tags'] = [body['tags']];
                                mongo.nuevo("noticias", body, function(err, data){
                                    if (err){
                                        res.end("ERROR");
                                    }else{
                                        res.end(""+data[0]._id);
                                    }
                                });
                            });
                        }else{
                            editando('noticias', {});
                        }
                    }else{
                        res.writeHead(404);
                        res.end("Not found");
                    }
                break;
                case "actividad":
                    var p = getParams(req);
                    if (p['id']){
                        if (req.method == "POST"){
                            var body = "";
                            req.on('data', function(data){ body += data; });
                            req.on('end', function(){
                                body = querystring.parse(body);
                                var tags = body['tags[]'];
                                if (tags) {
                                    body['tags'] = tags;
                                    delete body['tags[]'];
                                }
                                var users = body['users[]'];
                                if (users) {
                                    body['users'] = users;
                                    delete body['users[]'];
                                }
                                if (typeof body['users'] == "string") body['users'] = [body['users']];
                                if (body['users'].indexOf(user) == -1){
                                    body['users'].push(user);
                                }
                                body['date'] = parseInt(body['date']);
                                if (typeof body['tags'] == "string") body['tags'] = [body['tags']];
                                mongo.update(p['id'], "actividades", body, function(err, data){
                                    if (err){
                                        res.end("ERROR");
                                    }else{
                                        res.end("ACTUALIZADO");
                                    }
                                });
                            });
                        }else if (req.method == "DELETE"){
                            mongo.remove(p['id'], "actividades", function(err){
                                if (err){
                                    res.end("ERROR");
                                }else{
                                    res.end("BORRADO");
                                }
                            });
                        }else{
                            mongo.findOne('es', p['id'], 'actividades', function(err, datos1){
                                 mongo.findOne('eu', p['id'], 'actividades', function(err, datos2){
                                     datos1['title_eu'] = datos2['title_eu'];
                                     datos1['html_eu'] = datos2['html_eu'];
                                     editando('actividades', datos1);
                                 });
                            });
                        }
                    }else if (url.pathname.split("/")[3] == "nueva"){
                        if (req.method == "POST"){
                            var body = "";
                            req.on('data', function(data){ body += data; });
                            req.on('end', function(){
                                body = querystring.parse(body);
                                var tags = body['tags[]'];
                                if (tags) {
                                    body['tags'] = tags;
                                    delete body['tags[]'];
                                }
                                var users = body['users[]'];
                                if (users) {
                                    body['users'] = users;
                                    delete body['users[]'];
                                }
                                if (typeof body['users'] == "string") body['users'] = [body['users']];
                                body['users'] = [user];
                                body['date'] = parseInt(body['date']);
                                if (typeof body['tags'] == "string") body['tags'] = [body['tags']];
                                mongo.nuevo("actividades", body, function(err, data){
                                    if (err){
                                        res.end("ERROR");
                                    }else{
                                        res.end(""+data[0]._id);
                                    }
                                });
                            });
                        }else{
                            editando('actividades', {});
                        }
                    }else{
                        res.writeHead(404);
                        res.end("Not found");
                    }
                break;
                case "users":
                    switch(req.method){
                        case "GET":
                            var p = getParams(req);
                            if (p['id']){
                                mongo.getUserById(p['id'], function(err, user){
                                    res.writeHead(200, {"Content-Type": "application/json"});
                                    res.write(JSON.stringify(user));
                                    res.end();
                                });
                            }else{
                                mongo.listUsers(function(err,data){
                                    editando('users', {"users": data});
                                });
                            }
                        break;
                        default:
                            res.writeHead(404);
                            res.end("Not found");
                    }
                break;
                case "log":
                    if (url.pathname.split("/")[3] == "delete"){
                        var log = fs.createWriteStream('log.txt', {'flags': 'w'});
                        log.end("");
                        res.writeHead(302, {
                            'Location': '/edit/log'
                        });
                        res.end();
                    }else{
                        var log = fs.readFileSync('log.txt').toString();
                        editando('log', log.split("\n"));
                    }
                break;
                case "imgs":
                    mongo.flickr.api.photos.search({user_id: "124698999@N02", "page": "1", "per_page": "20"},function(data){
                        res.writeHead(200, {"Content-type": "application/json"});
                        res.end(JSON.stringify(data));
                    });
                break;
                case "signout":
                    delete sessions[k];
                    res.writeHead(302, {"Location": "/"});
                    res.end("Echo");
                break;
                default:
                    res.writeHead(404);
                    res.end("Not found");
            }
        }
    }else if (["background", "css", "img", "fonts", "js", "index_files", "google3be5fa6ef16d1692.html", "robots.txt"].indexOf(hizkuntza)>=0){
        //static files
        var type = url.pathname.split(".")[url.pathname.split(".").length-1];
        var mimetypes = {
            "eot" : "application/vnd.ms-fontobject",
            "otf" : "application/font-sfnt",
            "svg" : "image/svg+xml",
            "ttf" : "application/x-font-woff",
            "woff" : "application/font-woff",
            "html": "text/html",
            "jpeg": "image/jpeg",
            "jpg": "image/jpeg",
            "png": "image/png",
            "js": "text/javascript",
            "css": "text/css",
            "ico": "image/x-icon"
        }
        if (["jpeg" , "jpg", "png", "eot", "otf", "svg", "ttf", "woff", "ico"].indexOf(type) >= 0){
            try {
                var img = fs.readFileSync(url.pathname.substr(1));
                res.writeHead(200, {'Content-Type': mimetypes[type]});
                res.end(img, 'binary');
            }catch(err){
                //404 - not found
                error(res, hizkuntza, 404);
            }
        }else{
            fs.readFile(url.pathname.substr(1), 'utf8', function (err, data) {
                if (err) {
                    //404 - not found
                    error(res, hizkuntza, 404);
                }else{
                    res.writeHead(200, {'Content-Type': mimetypes[type]});
                    res.end(data);
                }
            });
        }
    }else if (hizkuntza == "sitemap.xml"){
        mongo.sitemap(function (err, datos){
           if (!err){
               res.writeHead(200, {'Content-Type': "text/xml"});
               res.write('<?xml version="1.0" encoding="UTF-8"?>');
               res.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
               res.write('<url><loc>http://getxokayaka.es/</loc><priority>1.0</priority></url>');
               res.write('<url><loc>http://getxokayaka.es/berriak</loc><priority>0.8</priority></url>');
               res.write('<url><loc>http://getxokayaka.es/jarduerak</loc><priority>0.8</priority></url>');
               res.write('<url><loc>http://getxokayaka.es/galeria</loc><priority>0.8</priority></url>');
               res.write('<url><loc>http://getxokayaka.es/kluba/getxokayaka</loc><priority>0.7</priority></url>');
               res.write('<url><loc>http://getxokayaka.es/kluba/kokapena</loc><priority>0.7</priority></url>');
               res.write('<url><loc>http://getxokayaka.es/kluba/kontaktua</loc><priority>0.7</priority></url>');
               res.write('<url><loc>http://getxokayaka.es/kluba/entrenamendua</loc><priority>0.7</priority></url>');
               res.write('<url><loc>http://getxokayaka.es/kluba/alokairua</loc><priority>0.7</priority></url>');
               for (var el in datos["noticias"]){
                   res.write('<url><loc>http://getxokayaka.es/berriak/'+datos["noticias"][el]['_id']+'</loc><priority>0.6</priority></url>');
               }
               for (var el in datos["actividades"]){
                   res.write('<url><loc>http://getxokayaka.es/jarduerak/'+datos["actividades"][el]['_id']+'</loc><priority>0.6</priority></url>');
               }
               for( el in datos["fotos"]["photosets"]["photoset"]){
                   var id = datos["fotos"]["photosets"]["photoset"][el]["id"];
                   res.write('<url><loc>http://getxokayaka.es/es/galeria?id='+id+'</loc><priority>0.5</priority></url>');
                   res.write('<url><loc>http://getxokayaka.es/eu/galeria?id='+id+'</loc><priority>0.5</priority></url>');
               }
               res.end('</urlset>');
           }else{
               res.writeHead(500);
               res.end("Internal error");
           } 
        });
    }else{
        var nabigatzaileko_hizkuntzak = req.headers["accept-language"];
        if(nabigatzaileko_hizkuntzak && nabigatzaileko_hizkuntzak.indexOf("eu") >= 0){
            //euskeraz
            res.writeHead(302, {'Location': '/eu'+url.pathname});
            res.end();
        }else{
            //gazteleraz
            res.writeHead(302, {'Location': '/es'+url.pathname});
            res.end();
        }
    }
}).listen(process.env.PORT || 5000, function(){
    console.log('%s: Node server started on getxokayaka:%d ...',
                        Date(Date.now()), process.env.OPENSHIFT_NODEJS_PORT);
});