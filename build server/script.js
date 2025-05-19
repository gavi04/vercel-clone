
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');
const Valkey = require("ioredis");

// Redis setup
const valkey = new Valkey( "rediss://default:AVNS_vqRCfHx1vKLtU99iKBz@valkey-vercel-gavisohal87.f.aivencloud.com:25231");

// S3 setup
const s3Client = new S3Client({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AccessKeyId,
        secretAccessKey: process.env.SecretAccessKey,
    },
});

const PROJECT_ID = process.env.PROJECT_ID;

function logAndPush(msg) {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${msg}`;
    console.log(message);
    valkey.lpush(PROJECT_ID, message);
}

async function init() {
    logAndPush('🚀 Executing script.js...');

    const outDirPath = path.join(__dirname, 'output');

    const p = exec(`cd ${outDirPath} && npm install && npm run build`);

    p.stdout.on('data', data => logAndPush(data.toString()));
    p.stderr?.on('data', data => logAndPush(`❌ stderr: ${data.toString()}`));

    p.on('close', async () => {
        logAndPush('✅ Build process completed. Looking for output folder...');

        const possibleDirs = ['dist', 'build', 'out'];
        const foundDir = possibleDirs.find(dir =>
            fs.existsSync(path.join(outDirPath, dir))
        );

        if (!foundDir) {
            logAndPush('❌ No output folder found (dist/build/out)');
            valkey.disconnect();
            return;
        }

        const distFolderPath = path.join(outDirPath, foundDir);
        const files = fs.readdirSync(distFolderPath, { recursive: true });

        for (const file of files) {
            const filePath = path.join(distFolderPath, file);
            if (fs.lstatSync(filePath).isDirectory()) continue;

            try {
                logAndPush(`📤 Uploading ${filePath} to S3...`);

                const command = new PutObjectCommand({
                    Bucket: 'vercel-iman',
                    Key: `__outputs/${PROJECT_ID}/${file}`,
                    Body: fs.createReadStream(filePath),
                    ContentType: mime.lookup(filePath) || 'application/octet-stream',
                });

                await s3Client.send(command);
                logAndPush(`✅ Uploaded ${filePath}`);
            } catch (err) {
                logAndPush(`❌ Upload error for ${filePath}: ${err.message}`);
            }
        }

        logAndPush('🏁 Done. All files uploaded.');
        valkey.disconnect();
    });
}

init();
