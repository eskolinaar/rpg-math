var field=null;
var selected_tile_index=0;
var tiles;
var fields_x;
var fields_y;
var size_x;
var size_y;
var mousedown;
var char_pos_indicator;
var mapdata;
var objectIndex;
var singular;
var maptransfer;

function initarray() {
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
    for (var i = 0; i < field.length; ++i) field[i] = 0;
    objectIndex[0]={ id:"0", name:"empty", symbol:"empty.png", type:"floor" };

    mapdata={};
    mapdata.x=1;
    mapdata.y=1;
    mapdata.mobs=[];
    mapdata.token=[];
}

function feedback(message) {
    $("body").append("<div class='feedback_message'>"+message+"</div>");
    $(".feedback_message").fadeIn(300).delay(650).fadeOut(300);
    setTimeout(function () { $(".feedback_message").remove(); }, 2000);
}

function repaint() {
    var canvas = document.getElementById('maincanvas');
    var ctx = canvas.getContext('2d');
    for (var i = 0; i < field.length; ++i) {
        field_x=i%fields_x;
        field_y=Math.floor(i/fields_x);
        ctx.drawImage(getFieldTile(i), field_x*size_x, field_y*size_y, size_x, size_y);
    }   

    ctx.drawImage(char_pos_indicator, (parseInt(mapdata.x)-1)*size_x, (parseInt(mapdata.y)-1)*size_y, size_x, size_y);

    let activePane=$("#menu li.chosen").attr("data-target");
    if (activePane=="token") {
        for (var i = 0; i < mapdata.mobs.length; ++i) {
            mob=mapdata.mobs[i];
            ctx.drawImage(tiles[parseInt(mob.id)], mob.x*size_x, mob.y*size_y, size_x, size_y);
        }
        for (var i = 0; i < mapdata.token.length; ++i) {
            tok=mapdata.token[i];
            ctx.drawImage(tiles[parseInt(tok.id)], tok.x*size_x, tok.y*size_y, size_x, size_y);
        }        
    } else {
        for (var i = 0; i < mapdata.token.length; ++i) {
            tok=mapdata.token[i];
            ctx.drawImage(tiles[parseInt(tok.id)], tok.x*size_x, tok.y*size_y, size_x, size_y);
        }        
        for (var i = 0; i < mapdata.mobs.length; ++i) {
            mob=mapdata.mobs[i];
            ctx.drawImage(tiles[parseInt(mob.id)], mob.x*size_x, mob.y*size_y, size_x, size_y);
        }
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
function moveActiveInstance(entityName, x, y) {
    if ($("#"+entityName+" ul li.active").length>0) {
        if (checkCollision(mapdata[entityName], field_x, field_y)) return;
        let mid=$("#"+entityName+" ul li.active").attr("data-id");                
        mapdata[entityName][mid].x=field_x;
        mapdata[entityName][mid].y=field_y;                
        $("#"+entityName+" ul li.active").removeClass("active");
        repaint();
        updateList(entityName);
        return;
    }            
}

function createNewInstance(entityName, x, y) {
    if (objectIndex[selected_tile_index].type==singular[entityName]) {
        if (checkCollision(mapdata[entityName], field_x, field_y)) return true;
        let el={};
        el.id=selected_tile_index;
        el.x=field_x;
        el.y=field_y;
        el.life=objectIndex[el.id].life;
        el.mathlimit=objectIndex[el.id].mathlimit;
        mapdata[entityName].push(el);
        repaint();
        updateList(entityName);
        return true;
    }            
    return false;
}

function updateList(entityName) {
    console.log("updating "+entityName+" list, ", mapdata[entityName]);
    let out="";
    if (mapdata[entityName]==undefined) mapdata[entityName]=[];        
    for (var i = 0; i < mapdata[entityName].length; ++i) {
        obj=mapdata[entityName][i];
        out+="<li data-id='"+i+"'>"+objectIndex[obj.id].name+" "+obj.x+"/"+obj.y;
        if (obj.life!=undefined) out+=", "+obj.life+"<span>&#10084;</span>";
        out+="</li>";
        console.log(obj, objectIndex[obj.id].name);
    }        
    $("#"+entityName+" ul").html(out);    
}

function loadFromFile(filename) {
    $.get(filename, function (data) {
        loadFromData(data);
    });    
}

function loadFromData(data) {
    mapdata=data;//JSON.parse(data);
    field=mapdata.fielddata;
    $("#char_x").val(mapdata.x);
    $("#char_y").val(mapdata.y);
    $("#char_direction").val(mapdata.direction);
    if (mapdata.introtext!=undefined && mapdata.introtext.en!=undefined) {
        $("#introtext_en").val(mapdata.introtext.en);
    }
    if (mapdata.introtext!=undefined && mapdata.introtext.en!=undefined) {
        $("#introtext_de").val(mapdata.introtext.de);
    }
    if (mapdata.quest!=undefined) {
        if (mapdata.quest.event!=undefined) {
            $("#quest_event").val(mapdata.quest.event);
        }
        if (mapdata.quest.amount!=undefined) {
            $("#quest_event_amount").val(mapdata.quest.amount);
        }   
        if (mapdata.quest.template!=undefined) {
            if (mapdata.quest.template.en!=undefined) {
                $("#quest_text_en").val(mapdata.quest.template.en);
            }
            if (mapdata.quest.template.de!=undefined) {
                $("#quest_text_de").val(mapdata.quest.template.de);
            }
        }                                      
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

    msg='{ \n"version":"21.01.001", \n"mapname":"'+$("#mapname").val()+'", \n"height": "30", \n"width": "30",';
    msg+='\n"x" : "'+parseInt($("#char_x").val())+'", \n"y" : "'+parseInt($("#char_y").val())+'", \n"direction" : "'+parseInt($("#char_direction").val())+'", \n"fielddata":[';
    msg+=field.join(",");       
    msg+='], \n"mobs":'+JSON.stringify(mapdata.mobs);
    msg+=', \n"token":'+JSON.stringify(mapdata.token);
    msg+=', \n"quest":'+JSON.stringify(mapdata.quest);
    msg+=', \n"introtext": '+JSON.stringify(mapdata.introtext);
    msg+='\n}';

    return msg;
}

$(document).ready(function () {
    maptransfer = new BroadcastChannel('maptransfer');

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
        initarray();

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

