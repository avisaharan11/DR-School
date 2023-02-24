exports = async function(type,data){
    var serviceName = "mongodb-atlas";
    var dbName = "students-data";
    var collName = "students-info";
    var collection = context.services.get(serviceName).db(dbName).collection(collName);
    let result;

    async function getStudentsInfo(){
      let data= await collection.find({});
      return data;
    }
    async function depositFees(data){
      let deposit=await collection.updateOne({rollNumber:data.rollNumber},{$push:{deposits:[data.amountToDeposit,data.dateOfDeposit]}})
      return deposit;
    }
    async function updatePhoneNumber(data){
        let update=await collection.updateOne({rollNumber:data.rollNumber},{$set:{contactNumbers:data.contactNumber}})
        return update;
    }
    
    if(type=="getStudentsInfo"){
        result = await getStudentsInfo();
    }
    else if(type=="depositFees"){
        result = await depositFees(data);
    }
    else if(type=="updatePhoneNumber"){
        result = await updatePhoneNumber(data);
    }
    // To call other named functions:
    // var result = context.functions.execute("function_name", arg1, arg2);
  
    return result;
  };