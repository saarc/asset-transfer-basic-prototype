`use strict`;

// 포함모듈
var express = require('express');
var path = require('path');
var fs = require('fs');

// ca 연결설정
const { Gateway, Wallets } = require('fabric-network');
const FabricCaServices = require('fabric-ca-client');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('./javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('./javascript/AppUtil.js');

const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');

const ccp = buildCCPOrg1();
const caClient = buildCAClient(FabricCaServices, ccp, 'ca.org1.example.com');

// express 설정
var app = express();
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended:false}));
app.use(express.json());

// 라우팅
// 0. 루트 라우팅
app.get('/', (req, res) => {
    res.sendFile(__dirname+'/public/index.html');
});

// 1. /admin POST params: id, password
app.post('/admin', async (req, res) => {
    
    const id = req.body.adminid;
    const adminpw = req.body.passwd;

    console.log(id, adminpw);

    try {

        const wallet = await buildWallet(Wallets, walletPath);

        await enrollAdmin(caClient, wallet, mspOrg1, id, adminpw); // id: admin, password: adminpw
    
        console.log('Success - admin.id');
        var result = '{"result":"sucess", "msg":"Success - admin.id"}';
        res.status(200).json(JSON.parse(result));

    } catch (error) {

        console.log(error);
        console.log('Failed - admin.id');
        var result = '{"result":"fail", "msg":"Failed - admin.id"}';
        res.status(200).json(JSON.parse(result));

    }
});

// 2. /user POST params: id
app.post('/user', async (req, res) => {
    var id = req.body.id;
    var userrole = req.body.role;

    console.log("/user", id, userrole);

    try {
        
        const wallet = await buildWallet(Wallets, walletPath);
        await registerAndEnrollUser(caClient, wallet, mspOrg1, id, 'org1.department1', userrole)

        var msg = `Success - ${id}.id`;
        console.log(msg);
        var result = `{"result":"success", "msg":"${msg}"}`;
        res.status(200).json(JSON.parse(result));

    } catch (error) {

        console.log(error);
        var msg = `Failed - ${id}.id`;
        console.log(msg);
        var result = `{"result":"fail", "msg":"${msg}"}`;
        res.status(200).json(JSON.parse(result));

    }

});

// 4. /asset POST -> create asset
app.post("/asset", async(req, res) =>{
    var cert = req.body.ascert;
    var id = req.body.asid;
    var color = req.body.ascolor;
    var size = req.body.assize;
    var owner = req.body.asowner;
    var value = req.body.asvalue;

    console.log("/asset-post", cert, id, color, size, owner, value);

    const gateway = new Gateway();
    try {
        // wallet 처리
        // (TODO) wallet 오류처리 해당 인증서가 없으면?
        const wallet = await buildWallet(Wallets, walletPath);

        await gateway.connect(ccp, {
            wallet,
            identity: cert,
            discovery: { enabled: true, asLocalhost: true }
        });
        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("basic");

        let data = await contract.submitTransaction('CreateAsset', id, color, size, owner, value);
        //result -> JSON
        console.log(data);
        var msg = `Success (CreateAsset) - ${id}`;
        console.log(msg);
        var result = `{"result":"success", "msg":"${msg}"}`;
        res.status(200).json(JSON.parse(result));

    } catch (error) {
        console.log(error);
        var msg = `Failed (CreateAsset) - ${id}`;
        console.log(msg);
        var result = `{"result":"fail", "msg":"${msg}"}`;
        res.status(200).json(JSON.parse(result));
    }
});

// 5. /asset GET -> read asset, param={인증서id, asset id}
app.get("/asset", async(req, res) => {
    var cert = req.query.cert;
    var assetid = req.query.aid;

    console.log("/user", cert, assetid);

    const gateway = new Gateway();
    try {
        // wallet 처리
        // (TODO) wallet 오류처리 해당 인증서가 없으면?
        const wallet = await buildWallet(Wallets, walletPath);

        await gateway.connect(ccp, {
            wallet,
            identity: cert,
            discovery: { enabled: true, asLocalhost: true }
        });
        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("basic");

        let data = await contract.evaluateTransaction('ReadAsset', assetid);
        //result -> JSON
        var msg = `Success (ReadAsset) - ${assetid}`;
        console.log(msg);
        var result = `{"result":"success", "msg":"${msg}"}`;

        var result_object = JSON.parse(result);
        result_object.content = JSON.parse(data);

        console.log(JSON.stringify(result_object));

        res.status(200).json(result_object);

    } catch (error) {
        console.log(error);
        var msg = `Failed (ReadAsset) - ${assetid}`;
        console.log(msg);
        var result = `{"result":"fail", "msg":"${msg}"}`;
        res.status(200).json(JSON.parse(result));
    }
});

// 6. /asset/tx POST -> transfer asset
app.post("/assets", async(req, res) =>{
    var cert = req.body.cert;
    var id = req.body.aid;
    var aowner = req.body.aowner;


    console.log("/asset/tx-post", cert, id, aowner);

    const gateway = new Gateway();
    try {
        // wallet 처리
        // (TODO) wallet 오류처리 해당 인증서가 없으면?
        const wallet = await buildWallet(Wallets, walletPath);

        await gateway.connect(ccp, {
            wallet,
            identity: cert,
            discovery: { enabled: true, asLocalhost: true }
        });
        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("basic");

        let data = await contract.submitTransaction('TransferAsset', id, aowner);
        //result -> JSON
        console.log(data);
        var msg = `Success (TransferAsset) - ${id}`;
        console.log(msg);
        var result = `{"result":"success", "msg":"${msg}"}`;
        res.status(200).json(JSON.parse(result));

    } catch (error) {
        console.log(error);
        var msg = `Failed (TransferAsset) - ${id}`;
        console.log(msg);
        var result = `{"result":"fail", "msg":"${msg}"}`;
        res.status(200).json(JSON.parse(result));
    }
});
// 7. /asset/tx GET -> history asset

// 3. 서버시작
app.listen(3000, ()=> {
    console.log('Express server is started: 3000');
});