const express = require('express')
const {generateSlug} = require('random-word-slugs')
const {ECSClient, RunTaskCommand} = require('@aws-sdk/client-ecs');
const Valkey = require("ioredis");
const{ Server }=require('socket.io');

const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); 
const PORT = 9000;

const io = new Server({
  cors:"*"
})



const serviceUri = "";//rediss url
const valkey = new Valkey(serviceUri);
const activeQueues = new Set();

io.on("connection",socket =>{
  socket.on('subscribe',channel=>{
    socket.join(channel)
    socket.emit('message',`joined ${channel}`)
  })
})





const client = new ECSClient({
    region: "ap-south-1",
    credentials: {
      accessKeyId:'',
      secretAccessKey:''
    }
  });

const config = {
    CLUSTER:'',
    TASK:''
        
}

app.post('/project',async (req,res)=>{
    const projectSlug = generateSlug()
    const gitUrl = req.body.gitUrl

    const command = new RunTaskCommand({

      cluster:config.CLUSTER,
      taskDefinition: config.TASK,
      launchType:'FARGATE',
      count:1,
      networkConfiguration:{
        awsvpcConfiguration:{
          assignPublicIp:'ENABLED',
          subnets:[],
          securityGroups:[]

        }
      },
      overrides:{
        containerOverrides:[
          {
            name:'builder-image',
            environment:[
              {name:"GIT_REPOSITORY_URL",value:gitUrl},
              {name:'PROJECT_ID',value:projectSlug},
              {name:'AccessKeyId',value:''},
              {name:'SecretAccessKey',value:''}
            ]
          }
        ]
      }
    })

    await client.send(command)

  return res.json({status:'queued',data:{projectSlug,url:`http://${projectSlug}.localhost:8000/`}})


})


/////////////////////////////////

async function pullMessages(projectId) {
  if (activeQueues.has(projectId)) return;
  activeQueues.add(projectId);

  const redis = new Valkey(serviceUri);
  console.log(`Started listening to Redis queue: ${projectId}`);      

  while (true) {
    try {
      const result = await redis.brpop(projectId, 0); // blocking pop
      const message = result[1];
      console.log(`[${projectId}] ${message}`);

      io.to(projectId).emit('log', message);
    } catch (err) {
      console.error(`Error in Redis pull for ${projectId}:`, err);
      break;
    }
  }

  redis.disconnect();
}

// Socket.IO: Client log subscription
io.on("connection", (socket) => {
  socket.on('subscribe', (projectId) => {
    socket.join(projectId);
    socket.emit('message', `joined ${projectId}`);
    pullMessages(projectId);
  });
});


////////////////////////////////




io.listen(9001,()=>{console.log("socket server running on 9001")})
app.listen(PORT,()=>{console.log(`listening on port ${PORT}`)})



