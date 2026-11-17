import fs from 'node:fs';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(fs.readFileSync('tools/testflight-source-manifest.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const e of manifest.files){const b=fs.readFileSync(e.path);if(sha(b)!==e.sha256&&sha(b.toString('utf8').replaceAll('\r\n','\n'))!==e.normalizedSha256)throw Error('Source changed: '+e.path);}
if(process.env.VITE_FIREBASE_PROJECT_ID&&process.env.VITE_FIREBASE_PROJECT_ID!=='fainance-a7794')throw Error('Wrong Firebase environment');
console.log(JSON.stringify({status:'SOURCE_VERIFIED',files:manifest.files.length,version:manifest.version,build:manifest.build,acceptedAndroid:manifest.acceptedAndroid}));
