// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const {Permission, SimpleResponse } = require("actions-on-google");
const mqtt = require('mqtt');
const axios = require('axios');
var client  = mqtt.connect('', {clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8), username: "", password: ""});
var rooms = [];

client.on('connect', function () {
 console.log("connected MQTT");
});

/*axios.get('http://161.35.8.148/api/actualrooms?home=1',{headers: {
    'Authorization': 'Basic c21hcnRob21lOm1laWNtMTIz'
 }})
  .then(function (response) {
    // handle success
    console.log(response);
  })
  .catch(function (error) {
    // handle error
    console.log(error);
  });
*/

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  //console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  //console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcome(agent) {
    //agent.add('Welcome to my agent!');
    const conv = agent.conv(); 
    return conv.ask(new Permission({
    context: 'To locate you',
    permissions: 'DEVICE_PRECISE_LOCATION',
  })); 
    
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }
  
  function turn(agent){
  	const device = agent.parameters.device;
  	const room = agent.parameters.room;
  	const state = agent.parameters.state;
    
    return axios.get('http://161.35.8.148/api/sensorbyname?sensorname='+ device).then(function (response) {
  // handle success
  if(room){
    if(response.data.roomname.toLowerCase()==room.toLowerCase()){
      console.log("OK");
      checkState(response,device,state);
    }else{
      console.log("Not same room");
      agent.add('The ' + device + ' does not exists in ' + room);
    }
  }else{
    checkState(response,device,state);
  }
}).catch(function (error) {
  // handle error
  console.log(error);
  agent.add('The ' + device + ' does not exists in this house');
});
    
    
    //client.publish('teste', device + ' ' + room + ' ' + state);
    //agent.add(device + ' ' + room + ' ' + state);
  }
  
  function checkState(response,device,state){
  if  (state!="status"){
    //ver type
    agent.add("It's done! I just turn "+state + " the " + device);
    client.publish('/'+response.data.id, JSON.stringify({"to": String(response.data.room), "from": "server", "action": "turn", "value":  String(state.toLowerCase())}));
    }else{
        agent.add('The ' + device + ' is ' + response.data.status);
    }
}
  
  function availableDevicesByRoom(agent){
    const room = agent.parameters.room;
    return axios.get('http://161.35.8.148/api/getsensorsbyroomname?roomname='+room.toLowerCase())
  .then(function (response) {
    // handle success
    let msg = 'The available devices of ' + room.toLowerCase()+ ' are:';
    console.log(response.data.length);
    for (const device in response.data){
    
      if(device < response.data.length-1){
        msg += ' ' + response.data[device].name + ',';
      }else{
        msg += ' and ' + response.data[device].name;
      }
    }
   agent.add(msg);
  })
  .catch(function (error) {
    // handle error
      agent.add("I dont know");
    console.log(error);
      
  });
  }
  
  function availableRooms(agent){
  return axios.get('http://161.35.8.148/api/actualrooms?home=1',{headers: {
    'Authorization': 'Basic c21hcnRob21lOm1laWNtMTIz'
 }})
  .then(function (response) {
    // handle success
    if(response.status == 200){
    
    let msg = 'The available rooms are:';
    console.log(response.data.length);
    for (const room in response.data){
    
      if(room < response.data.length-1){
        msg += ' ' + response.data[room].name + ',';
      }else{
        msg += ' ' + response.data[room].name;
      }
      
    }
       agent.add(msg);  
    }else{
    	agent.add("I dont know");
    }
  })
  .catch(function (error) {
    // handle error
    agent.add("I dont know");
    console.log(error);
    
  });
  }
  
  function lastPhoto(){
   return axios.get('http://161.35.8.148/api/getlastphoto')
  .then(function (response) {
    // handle success
     let image = 'http://161.35.8.148'+response.data.photo;
     let created = response.data.created_at;
     agent.add(new Card({
        title: `This is the last photo`,
        imageUrl: image,
       	text: 'Created at: ' +created
       })
     );
   
  })
  .catch(function (error) {
    // handle error
      agent.add("I dont know");
    console.log(error);
    
  });
  }
  
  function lastPhotoVehicle(){
  	return axios.get('http://161.35.8.148/api/checkiflastphotohasnotification')
  .then(function (response) {
    // handle success
    if(response.data.response!="not found"){
      let image = 'http://161.35.8.148'+response.data.photo;
      let licensePlate = response.data.licensePlate; 
      let allowed = response.data.description;
     agent.add("Yes and the license plate is " + licensePlate);
     agent.add(new Card({
       title: `This is the last photo`,
       imageUrl: image,
       text: 'The license plate is: ' + licensePlate + ' and it is ' + allowed
       })
     );
    }else{
      agent.add("There are no vehicles in that photo");
      
    }
    
  
  })
  .catch(function (error) {
    // handle error
    agent.add("There are no vehicles in that photo");
    //console.log("There are no vehicles in that photo");
  });
  }
  
  
  function getWeather(agent){
  return axios.get('https://api.openweathermap.org/data/2.5/weather?units=metric&lat=39.74&lon=-8.82&appid=')
  .then(function (response) {
    // handle success
    //console.log(response.data);
    //console.log(response.data.weather);
    let description = response.data.weather[0].description;
    //console.log(description[0].toUpperCase()+description.slice(1));
    //console.log("The temperature is "+ response.data.main.temp + " ºC and "+ response.data.main.humidity + "% of humidity" )
    //console.log(response.data.weather[0].icon)
    let image = "https://openweathermap.org/img/wn/"+response.data.weather[0].icon+ "@2x.png";
    agent.add("Its" + description[0].toUpperCase()+description.slice(1));
    agent.add("and the temperature is "+ response.data.main.temp + " ºC and "+ response.data.main.humidity + "% of humidity");
     agent.add(new Card({
       title: description[0].toUpperCase()+description.slice(1),
       imageUrl: image,
       text: "the temperature is "+ response.data.main.temp + " ºC and "+ response.data.main.humidity + "% of humidity"
       })
     );
  
  })
  .catch(function (error) {
    // handle error
     agent.add("WEATHER ERROR");
    console.log(error);
    agent.add("WEATHER ERROR");
  });

  
  }

  // // Uncomment and edit to make your own intent handler
  // // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function yourFunctionHandler(agent) {
  //   agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
  //   agent.add(new Card({
  //       title: `Title: this is a card title`,
  //       imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
  //       text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
  //       buttonText: 'This is a button',
  //       buttonUrl: 'https://assistant.google.com/'
  //     })
  //   );
  //   agent.add(new Suggestion(`Quick Reply`));
  //   agent.add(new Suggestion(`Suggestion`));
  //   agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
  // }
  
  

  // // Uncomment and edit to make your own Google Assistant intent handler
  // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function googleAssistantHandler(agent) {
  //   let conv = agent.conv(); // Get Actions on Google library conv instance
  //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
  //   agent.add(conv); // Add Actions on Google library responses to your agent's response
  // }
  // // See https://github.com/dialogflow/fulfillment-actions-library-nodejs
  // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample
  
  function getLocation(agent){
    agent.conv.data.requestedPermission = "DEVICE_PRECISE_LOCATION";
  agent.conv.ask(new SimpleResponse('Welcome to location tracker'));
  return agent.conv.ask(
    new Permission({
      context: "to locate you",
      permissions: agent.conv.data.requestedPermission
    })
  );
  }
  
  

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('turn', turn);
  intentMap.set('availableDevicesByRoom',availableDevicesByRoom);
  intentMap.set('availableRooms', availableRooms);
  intentMap.set('lastPhoto',lastPhoto);
  intentMap.set('lastPhoto.vehicle',lastPhotoVehicle);
  intentMap.set('getCurrentLocation',getLocation);
  intentMap.set('temperatureExternal',getWeather);
  agent.handleRequest(intentMap);
});
