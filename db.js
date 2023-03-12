
/**
 * @Title: Database Library For Frontend Account/Database Management
 * @version: 1.0
 */

const crypto = require('crypto');
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

const fs=require('fs');
class Database{
    constructor(HOSTNAME="localhost", PORT=process.env.PORT|3000, file="") {
        this.HOSTNAME=HOSTNAME;
        this.PORT=PORT;

        if(!HOSTNAME){
            throw new Error("Error DB0: The Provided HOSTNAME is invalid or null\n");
        }
        if(!PORT){
            throw new Error("Error DB1: The Provided PORT is invalid or null\n");
        }
        if(this.HOSTNAME.toLowerCase().startsWith("http")){
            throw new Error("Error DB2: Hostname *MUST NOT* start with \"http\" or \"https\"\n");
        }

        // Protocol Values
        const PROTOCOL={
            SIGNUP:0,
            EXISTS:1,
            LOGIN:2,
            DELETE:3,
            STORE:4,
            DLDATA:5,
            GETDATA:6,
            BYPASS:7,
        }
        if(!file){
            this.__DATA__={
                USERS:[],
            };
        }else{
            this.__DATA__=JSON.parse(fs.readFileSync(file, 'utf8'));
        }

        // Main Websocket Pipeline
        
        const __SERVER__=require("ws").Server;

        this._wss=new __SERVER__({host:this.HOSTNAME,port:this.PORT});

        // @ERROR DB3::DEBRICATED

        if(!this.__DATA__){
            throw new Error("Error DB7: The Data is currupted");
        }

        this._wss.on("connection", client=>{
            if(!client){
                throw new Error("Error DB4: Invalid or null client, an internal error occurred");
            }

            client.on("message", JSONData=>{
                const data=JSON.parse(JSONData);
                if(!data){
                    throw new Error("Error DB5: Received Data is an invalid JSON");
                }
                
                if(data.PROTOCOL===PROTOCOL.EXISTS){
                    client.send(this.CreateData({
                        PROTOCOL:PROTOCOL.EXISTS,
                        RESULT:this.UserExists(data.USERNAME)
                    }));
                }

                else if(data.PROTOCOL===PROTOCOL.SIGNUP){
                    const LogDetails=this.CreateUserIfPossible(data.USERNAME, data.PASSWORD);
                    client.send(this.CreateData({
                        PROTOCOL:PROTOCOL.SIGNUP,
                        RESULT:LogDetails.RESULT,
                        REASON:LogDetails.REASON
                    }));
                }

                else if(data.PROTOCOL===PROTOCOL.LOGIN){
                    const LogDetails=this.ConnectUserIfPossible(data.USERNAME, data.PASSWORD, data.COOKIE);
                    client.send(this.CreateData({
                        PROTOCOL:PROTOCOL.LOGIN,
                        RESULT:LogDetails.RESULT,
                        REASON:LogDetails.REASON
                    }));
                }

                else if(data.PROTOCOL===PROTOCOL.STORE){
                    const LogDetails=this.StoreDataIfPossible(data.USERNAME, data.COOKIE, data.DATA);
                    client.send(this.CreateData({
                        PROTOCOL:PROTOCOL.STORE,
                        RESULT:LogDetails.RESULT,
                        REASON:LogDetails.REASON
                    }));
                }

                else if(data.PROTOCOL===PROTOCOL.DELETE){
                    const LogDetails=this.DeleteUserIfPossible(data.USERNAME, data.PASSWORD);
                    client.send(this.CreateData({
                        PROTOCOL:PROTOCOL.DELETE,
                        RESULT:LogDetails.RESULT,
                        REASON:LogDetails.REASON
                    }));
                }

                else if(data.PROTOCOL===PROTOCOL.DLDATA){
                    const LogDetails=this.DeleteDataIfPossible(data.USERNAME, data.PASSWORD);
                    client.send(this.CreateData({
                        PROTOCOL:PROTOCOL.DLDATA,
                        RESULT:LogDetails.RESULT,
                        REASON:LogDetails.REASON
                    }));
                }

                else if(data.PROTOCOL===PROTOCOL.GETDATA){
                    const LogDetails=this.GetDataIfPossible(data.USERNAME, data.COOKIE);
                    client.send(this.CreateData({
                        PROTOCOL:PROTOCOL.GETDATA,
                        RESULT:LogDetails.RESULT,
                        REASON:LogDetails.REASON
                    }));
                }

                else if(data.PROTOCOL===PROTOCOL.BYPASS){
                    const LogDetails=this.ConnectWithoutLogging(data.USERNAME, data.COOKIE);
                    client.send(this.CreateData({
                        PROTOCOL:PROTOCOL.BYPASS,
                        RESULT:LogDetails.RESULT,
                        REASON:LogDetails.REASON
                    }));
                }
                
                else {
                    this.Receive(data, client);
                }
            });
        }); 
    }
    
    Receive(msg, socket){
        // Function for custom data
    }

    encrypt(text) {
        let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
    }

    decrypt(text) {
        let iv = Buffer.from(text.iv, 'hex');
        let encryptedText = Buffer.from(text.encryptedData, 'hex');
        let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }

    CreateData(data={}){
        return JSON.stringify(data);
    }

    UserExists(USERNAME=""){
        if(!this.__DATA__.USERS){
            throw new Error("Error DB6: Database does not contain any property \"USERS\", The data might be currupted");
        }
        let exists=false;
        for(let i of this.__DATA__.USERS){
            if(USERNAME===i.USERNAME){
                exists=true;
                break;
            }
        }
        return exists;
    }

    CreateUserIfPossible(USERNAME, PASSWORD){
        if(this.UserExists(USERNAME)){
            return {RESULT:false, REASON:"This Username is already taken"};
        }

        this.__DATA__.USERS.push({
            USERNAME:USERNAME,
            PASSWORD:this.encrypt(PASSWORD),
            COOKIES:[],
            DATA:{}
        });
        
        this.Save();
        return {RESULT:true, REASON:"Successfully Created Your Account"};;
    }

    ConnectUserIfPossible(USERNAME, PASSWORD, COOKIE){
        if(!this.UserExists(USERNAME, PASSWORD)){
            return {RESULT:false, REASON:"Username does not EXISTS"};
        }

        let index=0;
        for(let i of this.__DATA__.USERS){
            if(USERNAME===i.USERNAME&&PASSWORD===this.decrypt(i.PASSWORD)){
                this.__DATA__.USERS[index].COOKIES.push(COOKIE);
                this.Save();
                return {RESULT:true, REASON:"Succesfully logged in to the ACCOUNT"};
            }
            index++;
        }

        return {RESULT:false, REASON:"Invalid Password"};
    }

    ConnectWithoutLogging(USERNAME, COOKIE){
        if(!this.UserExists(USERNAME)){
            return {RESULT:false, REASON:"Username does not EXISTS"};
        }
        let d=false;
        for(let i of this.__DATA__.USERS){
            if(i.COOKIES.includes(COOKIE)){
                d=true;
                break;
            }
        }
        if(d){
            return {RESULT:true, REASON:"Successfully logged in to the ACCOUNT"};
        }else{
            return {RESULT:false, REASON:"Invalid User ID, Please try re-logging into your ACCOUNT"}
        }
    }

    StoreDataIfPossible(USERNAME, COOKIE, DATA){
        if(!this.UserExists(USERNAME)){
            return {RESULT:false, REASON:"Username does not EXISTS"};
        }

        let index=0;
        for(let i of this.__DATA__.USERS){
            if(USERNAME===i.USERNAME){
                if(i.COOKIES.includes(COOKIE)){
                    this.__DATA__.USERS[index].DATA=DATA;
                    this.Save();
                    return {RESULT:true, REASON:"Successfully Stored the data"};
                }else{
                    return {RESULT:false, REASON:"Invalid User ID, Please try re-logging into your ACCOUNT"};
                }
            }
            index++;
        }
    }

    DeleteUserIfPossible(USERNAME, PASSWORD){
        if(!this.UserExists(USERNAME)){
            return {RESULT:false, REASON:"Username does not EXISTS"};
        }

        let index=0;
        for(let i of this.__DATA__.USERS){
            if(USERNAME===i.USERNAME&&PASSWORD===i.PASSWORD){
                this.__DATA__.USERS.splice(index,1);
                this.Save();
                return {RESULT:true, REASON:"Successfully deleted your ACCOUNT"};
            }
            index++;
        }
    }

    DeleteDataIfPossible(USERNAME, PASSWORD){
        if(!this.UserExists(USERNAME)){
            return {RESULT:false, REASON:"Username does not EXISTS"};
        }
        
        let index=0;
        for(let i of this.__DATA__.USERS){
            if(USERNAME===i.USERNAME&&PASSWORD===i.PASSWORD){
                this.__DATA__.USERS[index].DATA={};
                this.Save();
                return {RESULT:true, REASON:"Successfully deleted your ACCOUNT'S DATA"};
            }
            index++;
        }
    }

    GetDataIfPossible(USERNAME, COOKIE){
        if(!this.UserExists(USERNAME)){
            return {RESULT:false, REASON:"Username does not EXISTS"};
        }

        let index=0;
        for(let i of this.__DATA__.USERS){
            if(USERNAME===i.USERNAME){
                if(i.COOKIES.includes(COOKIE)){
                    return {RESULT:true, REASON:i.DATA};
                }else{
                    return {RESULT:false, REASON:"Invalid User ID, Please try to re-logging into your ACCOUNT"};
                }
            }
            index++;
        }
    }

    Save(){
        fs.writeFile("database.json", JSON.stringify(this.__DATA__, undefined, 4), (err)=>{if(err)console.log("Error Saving the data:\n"+err)});
    }
}

exports.Database=Database;
