const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const mime = require('mime-types')

const Valkey = require("ioredis");

const serviceUri = "";//reddis url
const valkey = new Valkey(serviceUri);



const s3Client = new S3Client({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AccessKeyId,
        secretAccessKey: process.env.SecretAccessKey
    }
})

const PROJECT_ID = process.env.PROJECT_ID

async function init() {
    console.log('Executing script.js')
    const outDirPath = path.join(__dirname, 'output')
    const p = exec(`cd ${outDirPath} && npm install && npm run build`)    
    const queueName = PROJECT_ID;

    p.stdout.on('data', function (data) {
        console.log(data.toString())
        valkey.lpush(queueName, data.toString())
    })

    p.stdout.on('error', function (data) {
        console.log('Error', data.toString())
        valkey.lpush(queueName, `error: ${data.toString()}`)
    })
    
    p.on('close', async function () {
        console.log('Build Complete')
        valkey.lpush(queueName, 'Build Complete')
        const distFolderPath = path.join(__dirname, 'output', 'dist')
        const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true })

        for (const file of distFolderContents) {
            const filePath = path.join(distFolderPath, file)
            if (fs.lstatSync(filePath).isDirectory()) continue;

            console.log('uploading', filePath)
            valkey.lpush(queueName, `uploading...${filePath}`)
            

            const command = new PutObjectCommand({
                Bucket: 'vercel-iman',
                Key: `__outputs/${PROJECT_ID}/${file}`,
                Body: fs.createReadStream(filePath),
                ContentType: mime.lookup(filePath)
            })

            await s3Client.send(command)
            console.log('uploaded', filePath)
            valkey.lpush(queueName, `uploaded..${filePath}`)
           
           
        }
        valkey.lpush(queueName, `done no error`)
        valkey.disconnect();
        console.log('Done...')
    })
}

init()