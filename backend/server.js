const express = require('express')
const app = express()
app.use(express.json());       
app.use(express.urlencoded({extended: true})); 

const { MongoClient } = require("mongodb");

// Replace the uri string with your connection string.
const client = new MongoClient("mongodb+srv://admin:A4Appom@cluster0.ew2vs6l.mongodb.net/test");

async function find(query, method) {
    try {
        // Query for a movie that has the title 'Back to the Future'
        const database = client.db('Internal-Data');
        const feesData = database.collection('Fees-Data');

        const result = await feesData.find(query).toArray();
        return result
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}

app.post('/', async (req, res) => {
    let query={}
    console.log(query)
    let data=await find(query).catch(console.dir);
    res.send(data)
})

app.listen(3000, () => console.log(`Listening on 3000`))