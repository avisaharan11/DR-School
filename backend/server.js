const express = require('express')
const app = express()
const cors = require('cors')
app.use(express.json());       
app.use(express.urlencoded({extended: true})); 
app.use(cors())

const { MongoClient } = require("mongodb");

// Replace the uri string with your connection string.
const client = new MongoClient("mongodb+srv://admin:A4Appom@cluster0.ew2vs6l.mongodb.net/test");

async function find(query, method) {
    try {
        const database = client.db('students-data');
        const studentsInfo = database.collection('students-info');

        const result = await studentsInfo.find(query).toArray();
        return result
    } finally {
        //await client.close();
    }
}

async function update(condition, updation) {
    try {
        const database = client.db('students-data');
        const studentInfo = database.collection('students-info');
        const result=await studentInfo.updateOne(condition, updation)
        return result
    } finally {
    }
}

app.get('/api/allData', async (req, res) => {
    let query={}
    let data=await find(query).catch(console.dir);
    res.send(data)
})

app.post('/api/DepositFees', async (req, res) => {
    let condition={rollNumber:req.body.rollNumber}
    let updation={$push:{deposits:[req.body.amountToDeposit,req.body.dateOfDeposit]}}
    console.log(condition + " " + updation)
    let confirm=await update(condition,updation).catch(console.dir);
    res.send(confirm)
})

app.post('/api/updatePhoneNumber', async (req, res) => {
    let condition={rollNumber:req.body.rollNumber}
    let updation={$set:{contactNumbers:req.body.contactNumber}}
    let confirm=await update(condition,updation).catch(console.dir);
    res.send(confirm)
})

app.listen(3000, () => console.log(`Listening on 3000`))