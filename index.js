const { Database } = require('./db');

const db=new Database("127.0.0.1", 61645, "database.json");
db.Save();


db.Receive=(data, client)=>{
    if(data.PROTOCOL===-1){ // Like a post
        for(let i=0;i<db.__DATA__.POST.length;i++){
            if(db.__DATA__.POST[i].id==data.id){
                db.__DATA__.POST[i].like++;
                db.__DATA__.POST[i].likedBy.push(data.user);
                break;
            }
        }
    }
    if(data.PROTOCOL===-3){ // Unlike a post
        for(let i=0;i<db.__DATA__.POST.length;i++){
            if(db.__DATA__.POST[i].id==data.id){
                db.__DATA__.POST[i].like--;
                for(let j=0;j<db.__DATA__.POST[i].likedBy.length;j++){
                    if(db.__DATA__.POST[i].likedBy[j]==data.user){
                        db.__DATA__.POST[i].likedBy.splice(j, 1);
                        break;
                    }
                }
                break;
            }
        }
    }

    if(data.PROTOCOL===-2){ // Get All Posts
        client.send(db.CreateData({
            PROTOCOL:-2,
            post:db.__DATA__.POST
        }));
    }

    if(data.PROTOCOL===-4){ // Get A Specific Post
        for(let i=0;i<db.__DATA__.POST.length;i++){
            if(db.__DATA__.POST[i].id==data.id){
                client.send(db.CreateData({
                    PROTOCOL:-4,
                    post:db.__DATA__.POST[i]
                }));
                break;
            }
        }
    }

    if(data.PROTOCOL===-5){ // Upload a comment
        for(let i=0;i<db.__DATA__.POST.length;i++){
            if(db.__DATA__.POST[i].id==data.id){
                db.__DATA__.POST[i].comments.push({
                    name: data.name,
                    comment: data.comment
                });
                break;
            }
        }
    }

    if(data.PROTOCOL===-6){ // Upload a post
        // download(data.thumb, 'img/s'+id+".png", function(){});
        db.__DATA__.POST.push({
            id:db.__DATA__.POST.length,
            by:data.user,
            thumb:data.thumb,
            title:data.title,
            like:0,
            likedBy:[],
            comments:[]
        });
    }

    db.Save();
}


var download = function(uri, filename, callback){
    request.head(uri, function(err, res, body){
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};
