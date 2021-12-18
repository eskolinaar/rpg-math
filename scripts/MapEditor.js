let field=null;
let selected_tile_index=0;
let tiles;
let fields_x;
let fields_y;
let size_x;
let size_y;
let mousedown;
let char_pos_indicator;
let mapdata;
let objectIndex;
let singular;
let maptransfer;
let canvas = null;
let ctx = null;
let mob = null;
let tok = null;

function initVariables() {
    singular=[];
    singular["mobs"]="mob";
    singular["token"]="token";

    fields_x=30;
    fields_y=30;
    size_y=Math.floor(window.innerHeight/fields_y);
    size_x=Math.floor(window.innerHeight/fields_x);
    mousedown=0;
    
    console.log("height: ", window.innerHeight, fields_y, size_y, size_y*fields_y);
    $("canvas").css("margin-top", "0px");
    field = new Array(fields_x*fields_y);
    for (let i = 0; i < field.length; ++i) field[i] = 0;
    objectIndex[0]={ id:"0", name:"empty", symbol:"empty.png", type:"floor" };

    mapdata={};
    mapdata.x=1;
    mapdata.y=1;
    mapdata.mobs=[];
    mapdata.token=[];

    canvas = document.getElementById('maincanvas');
    ctx = canvas.getContext('2d');
}

function feedback(message) {
    $("body").append("<div class='feedback_message'>"+message+"</div>");
    $(".feedback_message").fadeIn(300).delay(650).fadeOut(300);
    setTimeout( () => $(".feedback_message").remove() , 2000);
}

function repaintField(ctx) {
    let field_x = 0;
    let field_y = 0;
    for (let i = 0; i < field.length; ++i) {
        field_x=i%fields_x;
        field_y=Math.floor(i/fields_x);
        ctx.drawImage(getFieldTile(i), field_x*size_x, field_y*size_y, size_x, size_y);
    }
}

function repaintCharacter() {
    ctx.drawImage(char_pos_indicator, (parseInt(mapdata.x)-1)*size_x, (parseInt(mapdata.y)-1)*size_y, size_x, size_y);
}

function shouldPaintOnTop(paneName) {
    return $("#menu li.chosen").attr("data-target")==paneName;
}

function repaintMobs() {
    for (let i = 0; i < mapdata.mobs.length; ++i) {
        mob=mapdata.mobs[i];
        ctx.drawImage(tiles[parseInt(mob.id)], mob.x*size_x, mob.y*size_y, size_x, size_y);
    }
}

function repaintToken() {
    for (let i = 0; i < mapdata.token.length; ++i) {
        tok=mapdata.token[i];
        ctx.drawImage(tiles[parseInt(tok.id)], tok.x*size_x, tok.y*size_y, size_x, size_y);
    }
}

function repaint() {
    if (canvas == null) return;
    if (ctx == null) return;

    repaintField(ctx);
    repaintCharacter();

    if (shouldPaintOnTop("token")) {
        repaintMobs();
        repaintToken();
    } else {
        repaintToken();
        repaintMobs();
    }
}

function clearActive() {
    $("#mobs ul li").removeClass("active");
    $("#token ul li").removeClass("active");
}

function getFieldTile(idx) {
    if (tiles[field[idx]]==undefined) { console.log("invalid index "+field[idx]+" in field. cannot load map."); return tiles[0]; }
    return tiles[field[idx]];
}

function checkCollision(arr, x, y) {
    for (var i = 0; i < arr.length; ++i) {
        if (arr[i].x==x && arr[i].y==y) {
            return true;                    
        }                     
    }            
    return false;
}

// entityName = "mob" | "token"
//
// check if an entity is flagged active (to be moved,edited etc.)
// check for collision, move & update ui
function moveActiveInstance(entityName, field_x, field_y) {
    if ($("#"+entityName+" ul li.active").length>0) {
        if (checkCollision(mapdata[entityName], field_x, field_y)) return;
        let instanceId=$("#"+entityName+" ul li.active").attr("data-id");
        mapdata[entityName][instanceId].x=field_x;
        mapdata[entityName][instanceId].y=field_y;
        $("#"+entityName+" ul li.active").removeClass("active");
        repaint();
        updateList(entityName);
    }
}

function createNewInstance(entityName, field_x, field_y) {
    if (objectIndex[selected_tile_index].type==singular[entityName]) {
        if (checkCollision(mapdata[entityName], field_x, field_y)) return true;
        let el={};
        el.id=selected_tile_index;
        el.x=field_x;
        el.y=field_y;
        el.life=objectIndex[el.id].life;
        mapdata[entityName].push(el);
        repaint();
        updateList(entityName);
        return true;
    }            
    return false;
}

function generateListItem(idx, obj) {
    let out="<li data-id='"+idx+"'>"+objectIndex[obj.id].name+" "+obj.x+"/"+obj.y;
    if (obj.life!=undefined) out+=", "+obj.life+"<span>&#10084;</span>";
    out+="</li>";
    return out;
}

function updateList(entityName) {
    console.log("updating "+entityName+" list, ", mapdata[entityName]);
    let out = "";
    if (mapdata[entityName]==undefined) mapdata[entityName]=[];
    for (let i = 0; i < mapdata[entityName].length; ++i) {
        out+=generateListItem(i, mapdata[entityName][i]);
    }
    $("#"+entityName+" ul").html(out);    
}

function loadFromFile(filename) {
    $.get(filename, function (data) {
        loadFromData(data);
    });    
}

function getIntroText(lang) {
    if (mapdata.introtext!=undefined && mapdata.introtext[lang]!=undefined) {
        return mapdata.introtext[lang];
    }
    return "";
}

function getQuestDataAttribute(attr, lang) {
    if (mapdata.quest[attr] == undefined) return;
    if (lang == undefined) {
        return mapdata.quest[attr];
    } else {
        if (mapdata.quest[attr][lang] == undefined) return;
        return mapdata.quest[attr][lang];
    }
}

function loadFromData(data) {
    mapdata=data;
    field=mapdata.fielddata;
    $("#char_x").val(mapdata.x);
    $("#char_y").val(mapdata.y);
    $("#char_direction").val(mapdata.direction);
    $("#introtext_en").val(getIntroText("en"));
    $("#introtext_de").val(getIntroText("de"));

    if (mapdata.quest!=undefined) {
        $("#quest_event").val(getQuestDataAttribute("event"));
        $("#quest_event_amount").val(getQuestDataAttribute("amount"));
        $("#quest_text_en").val(getQuestDataAttribute("template", "en"));
        $("#quest_text_de").val(getQuestDataAttribute("template", "de"));
    }
    updateList("mobs");
    updateList("token");
    repaint();
    feedback("File was successfully loaded!");    
}

function downloadFile(filedata) {// , filename
  var lnk = document.createElement("a");
  let today = (new Date()).toISOString().substr(0, 10);
  let ms = (new Date()).toISOString().substr(20, 3);
  lnk.download = "m"+today+"-"+ms+".map.json";
  lnk.href = "data:application/json,"+filedata;
  $("body")[0].appendChild(lnk);
  lnk.click();
  $("body")[0].removeChild(lnk);
}

function createJSONStringFromMap() {
    console.log("saving...");
    mapdata.introtext={};
    mapdata.introtext.de=$("#introtext_de").val();
    mapdata.introtext.en=$("#introtext_en").val();

    mapdata.quest={};
    mapdata.quest.event=$("#quest_event").val();
    mapdata.quest.amount=$("#quest_event_amount").val();
    mapdata.quest.template={};
    mapdata.quest.template.en=$("#quest_text_en").val();
    mapdata.quest.template.de=$("#quest_text_de").val();
    mapdata.fog=$("#fog").val();
    mapdata.light=$("#light").val();

    msg='{ \n"version":"21.01.001", \n"mapname":"'+$("#mapname").val()+'", \n"height": "30", \n"width": "30",';
    msg+='\n"fog": '+JSON.stringify(mapdata.fog)+',';
    msg+='\n"light": '+JSON.stringify(mapdata.light)+',';
    msg+='\n"x" : "'+parseInt($("#char_x").val())+'", \n"y" : "'+parseInt($("#char_y").val())+'", \n"direction" : "'+parseInt($("#char_direction").val())+'", \n"fielddata":[';
    msg+=field.join(",");       
    msg+='], \n"mobs":'+JSON.stringify(mapdata.mobs);
    msg+=', \n"token":'+JSON.stringify(mapdata.token);
    msg+=', \n"quest":'+JSON.stringify(mapdata.quest);
    msg+=', \n"introtext": '+JSON.stringify(mapdata.introtext);
    msg+='\n}';

    return msg;
}

function updateLocalStorageIndex() {
    let maps = localStorage.getItem("maps");
    if (maps == null) return;
    maps = JSON.parse(maps);
    if (maps.length<1) {
        $("#localStorage_mapview").html("<p>*** no maps found ***</p>");
        return;
    }
    let out = "";
    for (var map in maps) {
        out += "<li>" + maps[map].mapname + "</li>";
    }
    $("#localStorage_mapview").html(out);
}

$(document).ready(function () {
    maptransfer = new BroadcastChannel('maptransfer');

    updateLocalStorageIndex();

    $(".pane").hide();
    $(".pane[data-pane=overview]").show();

    $("#menu li[data-target]").on("click", function (){
        tar=$(this).attr("data-target");
        $("#menu li").removeClass("chosen");
        $(this).addClass("chosen");
        $("*[data-pane]").hide();
        $("*[data-pane*="+tar+"]").show();
        repaint();
    });

    $("canvas").attr("height", window.innerHeight);
    $("canvas").attr("width", window.innerHeight);
    
    $("canvas").css("height", window.innerHeight+"px");
    $("canvas").css("width", window.innerHeight+"px");
    
    $.get( "objects/objectIndex.json", function( data ) {
        console.log("reading objectIndex, ", data);
        objectIndex=data;//JSON.parse(data);
        tiles=[];
        initVariables();

        imagepreload="";

        imagepreload+="<div data-pane='fielddata'>";
        for (var i in objectIndex) {
            if (objectIndex.hasOwnProperty(i)) {
                // id, mesh, symbol, texture, type
                if (objectIndex[i].type=="floor")
                imagepreload+="<img id='tile"+objectIndex[i].id+"' data-id='"+objectIndex[i].id+"' src='objects/symbol/"+objectIndex[i].symbol+"'>";
            }
        }
        imagepreload+="<br><br>";        
        for (var i in objectIndex) {
            if (objectIndex.hasOwnProperty(i)) {
                // id, mesh, symbol, texture, type
                if (objectIndex[i].type=="wall")
                imagepreload+="<img id='tile"+objectIndex[i].id+"' data-id='"+objectIndex[i].id+"' src='objects/symbol/"+objectIndex[i].symbol+"'>";
            }
        }
        //imagepreload+="<img id='tile0' data-id='0' src='objects/symbol/empty.png'>";
        imagepreload+="</div><div data-pane='mobs'>";

        for (var i in objectIndex) {
            if (objectIndex.hasOwnProperty(i)) {
                // id, mesh, symbol, texture, type
                if (objectIndex[i].type=="mob")
                imagepreload+="<img id='tile"+objectIndex[i].id+"' data-id='"+objectIndex[i].id+"' src='objects/symbol/"+objectIndex[i].symbol+"'>";
            }
        }
        imagepreload+="<img id='x' style='display:none' data-id='x' src='objects/symbol/x.png'>";
        imagepreload+="</div><div data-pane='token'>";

        for (var i in objectIndex) {
            if (objectIndex.hasOwnProperty(i)) {
                // id, mesh, symbol, texture, type
                if (objectIndex[i].type=="token")
                imagepreload+="<img id='tile"+objectIndex[i].id+"' data-id='"+objectIndex[i].id+"' src='objects/symbol/"+objectIndex[i].symbol+"'>";
            }
        }
        imagepreload+="</div>";
        $("div#imagepreload").append(imagepreload);

        for (var i in objectIndex) {
            if (objectIndex.hasOwnProperty(i)) {
                tiles[i]=document.getElementById("tile"+i);
            }
        }
        tiles[0]=document.getElementById("tile0");
        char_pos_indicator=document.getElementById("x");

        setTimeout(repaint, 300);       
    });
    

    $("div#imagepreload").on("click", "img", function () {
        src=$(this).attr("src");
        id=$(this).attr("id");
        $("div#selection_indicator img:eq(0)").attr("src", src);

        selected_tile_index=$(this).attr("data-id");
        clearActive();
    });

    $("#mobs").on("click", "ul li", function () {
        clearActive();
        $(this).addClass("active");

        // update details form
        let mid=$("#mobs ul li.active").attr("data-id");
        let mob=mapdata.mobs[mid];
        console.log("mob clicked", mob);
        if (mob!=undefined) {
            if (mob.x!==undefined) $("#mob_x").val(mob.x); else $("#mob_x").val("");
            if (mob.y!==undefined) $("#mob_y").val(mob.y); else $("#mob_y").val("");
            if (mob.life!==undefined) $("#mob_life").val(mob.life); else $("#mob_life").val("");
            if (mob.mode!==undefined) $("#mob_mode").val(mob.mode); else $("#mob_mode").val("");
            if (mob.movement!==undefined) $("#mob_movement").val(mob.movement); else $("#mob_movement").val("");
            if (mob.rotation!==undefined) $("#mob_rotation").val(mob.rotation); else $("#mob_rotation").val("");
        }
    });

    $("#mob_details").on("change", "input", function (e) {
        let mid = $("#mobs ul li.active").attr("data-id");
        let mob = mapdata.mobs[mid];
        console.log("change", e, mob);
        let fname = e.target.getAttribute("data-fieldname");
        let val = e.target.value;
        if (val == "") {
            val = undefined;
            delete mapdata.mobs[mid][fname];
            console.log("change [delete]", e, mob, fname, val);
            return;
        }
        mapdata.mobs[mid][fname] = val;
        console.log("change", e, mob, fname, val);
    });

    $("#token").on("click", "ul li", function () {
        clearActive();
        $(this).addClass("active");
    });        

    $("#mobs .remove").on("click", function () {
        let mid=$("#mobs ul li.active").attr("data-id");
        mapdata.mobs.splice(mid, 1);
        repaint();
        updateList("mobs");
    });        

    $("#token .remove").on("click", function () {
        let mid=$("#token ul li.active").attr("data-id");
        mapdata.token.splice(mid, 1);
        repaint();
        updateList("token");
    });

    $("canvas#maincanvas").mousemove(function(e){            
        if (mousedown==1) {
            if (objectIndex[selected_tile_index].type=="mob") return;
            if (objectIndex[selected_tile_index].type=="token") return;
            var relativeX = e.pageX - $(this).parent().parent()[0].offsetLeft;
            var relativeY = e.pageY - this.offsetTop;

            field_x=Math.floor(relativeX/size_x);
            field_y=Math.floor(relativeY/size_y);
            field[field_y*fields_x+field_x]=selected_tile_index;

            var canvas = document.getElementById('maincanvas');
            var ctx = canvas.getContext('2d');
            for (var i = 0; i < field.length; ++i) {
                field_x=i%fields_x;
                field_y=Math.floor(i/fields_x);

                ctx.drawImage(getFieldTile(i), field_x*size_x, field_y*size_y, size_x, size_y);
            }

            ctx.drawImage(char_pos_indicator, (parseInt(mapdata.x)-1)*size_x, (parseInt(mapdata.y)-1)*size_y, size_x, size_y);

            for (var i = 0; i < mapdata.mobs.length; ++i) {
                mob=mapdata.mobs[i];
                ctx.drawImage(tiles[parseInt(mob.id)], mob.x*size_x, mob.y*size_y, size_x, size_y);
            } 
            for (var i = 0; i < mapdata.token.length; ++i) {
                tok=mapdata.token[i];
                ctx.drawImage(tiles[parseInt(tok.id)], tok.x*size_x, tok.y*size_y, size_x, size_y);
            }   
        }
    });

    $("canvas#maincanvas").mousedown(function (e) {
        if ($("#mobs ul li.active").length<1 && $("#token ul li.active").length<1) {
            var relativeX = e.pageX - $(this).parent().parent()[0].offsetLeft;
            let relativeY = e.pageY - this.offsetTop;

            let field_x=Math.floor(relativeX/size_x);
            let field_y=Math.floor(relativeY/size_y);
            for (var i = 0; i < mapdata.mobs.length; ++i) {
                if (mapdata.mobs[i].x==field_x && mapdata.mobs[i].y==field_y) {
                    $("#mobs ul li").eq(i).addClass("active");
                    return;
                }
            }
            for (var i = 0; i < mapdata.token.length; ++i) {
                if (mapdata.token[i].x==field_x && mapdata.token[i].y==field_y) {
                    $("#token ul li").eq(i).addClass("active");
                    return;
                }
            }        
            if (objectIndex[selected_tile_index].type=="mob") return;
            if (objectIndex[selected_tile_index].type=="token") return;
            let activePane=$("#menu li.chosen").attr("data-target");
            if (activePane!="fielddata") return;

            mousedown=1;
        }
    });

    $("canvas#maincanvas").mouseup(function (e) {
        mousedown=0;
    });

    $("canvas#maincanvas").click(function (e) {
        var relativeX = e.pageX - $(this).parent().parent()[0].offsetLeft;
        var relativeY = e.pageY - this.offsetTop;

        field_x=Math.floor(relativeX/size_x);
        field_y=Math.floor(relativeY/size_y);

        let activePane=$("#menu li.chosen").attr("data-target");

        if (activePane=="mobs") {
            if (moveActiveInstance("mobs", field_x, field_y)) return;
            if (createNewInstance("mobs", field_x, field_y)) return;
            return;
        }

        if (activePane=="token") {
            if (moveActiveInstance("token", field_x, field_y)) return;    
            if (createNewInstance("token", field_x, field_y)) return;
            return;
        }

        if (activePane=="fielddata") {
            if (objectIndex[selected_tile_index].type=="mob") return;
            if (objectIndex[selected_tile_index].type=="token") return;
            field[field_y*fields_x+field_x]=selected_tile_index;
        }

        if (activePane=="start") {
            console.log("changing starting position via click nyi");
            mapdata.x=field_x+1;
            mapdata.y=field_y+1; 
            $("#char_x").val(field_x+1);
            $("#char_y").val(field_y+1);
            repaint();   

        }

        repaint();                      
    });

    $("button#savefilebutton").click(function () {       
        downloadFile(encodeURIComponent(createJSONStringFromMap()));
    });

    $("button#savebrowserbutton").click(function () {
        let maps=localStorage.getItem("maps");
        if (maps == null) {
            maps=[];
        } else {
            maps = JSON.parse(maps);
        }

        let today = (new Date()).toISOString().substr(0, 10);
        let ms = (new Date()).toISOString().substr(20, 3);
        let mapname = "m"+today+"-"+ms+".map.json";

        maps.push({ mapname:mapname, mapdata:createJSONStringFromMap() });
        localStorage.setItem("maps", JSON.stringify(maps));
        updateLocalStorageIndex();
        feedback("Map was successfully saved to '"+mapname+"'!");
    });

    $("button#savebutton").click(function () {
        $("textarea#output").html(createJSONStringFromMap());
    });

    $("button#broadcastbutton").click(function () {
        maptransfer.postMessage({
            type: "transfer_map",
            map: createJSONStringFromMap()
        });
    });

    maptransfer.onmessage=function (ev) { 
        console.log("getting message from game ...", ev.data.type);

        if (ev.data.type=="transfer_map_ack") {
            feedback("Map was opened in other browser tab");
        }    
        if (ev.data.type=="transfer_map_check") {
            feedback("Game has checked for pending map transfer");
            console.log("sending map ... transfer_map");
            maptransfer.postMessage({
                type: "transfer_map",
                map: createJSONStringFromMap()
            });
        }
    }
    
    $("button#loadbutton").click(function () {
        console.log("loading...");
        loadFromFile($("#mapname2").val());       
    });

    $("body").on("change", ".map_editor_file_upload", (e) => {        
        console.log("file upload triggered", e);
        console.log("file upload triggered", e.target);
        console.log(e.target.files[0]);
        let file=e.target.files[0];
        if (file.type!="application/json") {
            feedback("wrong file type for upload");
            return;
        }
        if (file.size>20000) {
            feedback("untypical file size");
            return;
        }
        let reader = new FileReader();
        reader.onload=(evt) => {
            feedback("read file ended ...");
            console.log(evt.target.result);
            loadFromData(JSON.parse(evt.target.result));
        }
        reader.readAsText(file);
    });    

    $("button#update").on("click", function () {
        console.log("updating char position ...");
        mapdata.x=parseInt($("#char_x").val());
        mapdata.y=parseInt($("#char_y").val());    
        repaint();                    
    });

    $("button#fill").on("click", function () {
        console.log("fill ...");
        if (objectIndex[selected_tile_index].type=="mob") return;
        if (objectIndex[selected_tile_index].type=="token") return;
        for (var i = 0; i < field.length; ++i) {
            field[i]=selected_tile_index;
        }
        repaint();                    
    });

    $("#clearbrowserstoragebutton").click(function () {
        $("#loadfrombrowser").toggleClass("deletemode");
    });

    $("#loadfrombrowser").on("click", "li", function() {
        let maps=localStorage.getItem("maps");
        if (maps == null) return;
        maps = JSON.parse(maps);
        for (var map in maps) {
            if ($(this).text()==maps[map].mapname) {
                if ($("#loadfrombrowser").hasClass("deletemode")) {
                    maps.splice(map, 1);
                    localStorage.setItem("maps", JSON.stringify(maps));
                    feedback("Map deleted!");
                    updateLocalStorageIndex();
                    return;
                } else {
                    loadFromData(JSON.parse(maps[map].mapdata));
                    return;
                }
            }
        }
        feedback("Could not load map '"+$(this).text()+"'!");
    });

    $("button#optimize").on("click", function () {
        console.log("optimieren ...");
        // from top down
        for (var x=0;x<fields_x;x++) {
            stop=false;
            for (var y=0;y<fields_y;y++) {
                if (stop==false && objectIndex[field[y*fields_x+x]].type=="floor") {
                    field[y*fields_x+x]=0;
                } else {
                    stop=true;
                }             
            }
        }
        // from bottom up
        for (var x=0;x<fields_x;x++) {// var x=fields_x-1;x>=0;x--
            stop=false;
            for (var y=fields_y-1;y>=0;y--) {
                if (stop==false && objectIndex[field[y*fields_x+x]].type=="floor") {
                    field[y*fields_x+x]=0;
                } else {
                    stop=true;
                }             
            }
        }
        // from left to right
        for (var y=0;y<fields_x;y++) {
            stop=false;
            for (var x=0;x<fields_y;x++) {
                if (stop==false && objectIndex[field[y*fields_x+x]].type=="floor") {
                    field[y*fields_x+x]=0;
                } else {
                    stop=true;
                }             
            }
        }    
        // from right to left
        for (var y=0;y<fields_x;y++) {
            stop=false;
            for (var x=fields_x-1;x>=0;x--) {
                if (stop==false && objectIndex[field[y*fields_x+x]].type=="floor") {
                    field[y*fields_x+x]=0;
                } else {
                    stop=true;
                }             
            }
        }   
        // nyi
        repaint();                    
    });        
});

