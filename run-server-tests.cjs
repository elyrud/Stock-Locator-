const fs=require('node:fs');
const {run}=require('node:test');
const stream=run({files:[require('node:path').join(__dirname,'server.test.cjs')],isolation:'none'});
const lines=[];
stream.on('test:pass',event=>lines.push('PASS '+event.name));
stream.on('test:fail',event=>lines.push('FAIL '+event.name+'\n'+(event.details.error?.stack || event.details.error)));
stream.on('end',()=>fs.writeFileSync('server-test-result.txt',lines.join('\n')));
stream.resume();
