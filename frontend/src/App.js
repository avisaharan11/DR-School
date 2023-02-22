import { useEffect, useState, useRef } from "react";
import axios from "axios";

function App() {
  let [data, setData] = useState([]);
  useEffect(() => { fetchData(); }, []);
  function fetchData() {
    axios.get("http://localhost:3000/api/allData").then((response) => {
      //console.log(response.data);
      setData(response.data);
    });
  }
  return (
    <CheckDataByAdmin data={data} fetchData={fetchData} />
  );
}

function CheckDataByAdmin(props) {
  const classGradeRef = useRef(0);
  const nameRef = useRef("");
  const rollNumberRef = useRef('');

  let data = props.data;
  let classGrades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  let [name, setName] = useState("")
  let [classGrade, setClassGrade] = useState(0)
  let [rollNumber, setRollNumber] = useState(0)

  function filterData() {
    let filteredData = data.filter((student) => (student ? (student.classGrade == classGrade) : true) && (name ? (student.name == name) : true))
    return filteredData
  }

  useEffect(() => setName(nameRef.current.value), [classGrade])
  useEffect(() => setRollNumber(rollNumberRef.current.value), [name])

  return (
    <>
      <form>
        <div className="form-group mb-3">
          <label htmlFor="classGrade">Class</label>
          <select className="form-select" aria-label="Select Class" name="classGrade" ref={classGradeRef} onChange={(e) => setClassGrade(e.target.value)}>
            {classGrade == 0 ? <option value={0}>Select Class</option> : null}
            {classGrades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
          </select>
        </div>
        <div className="form-group mb-3">
          <label htmlFor="name">Name</label>
          <select className="form-select" aria-label="Select Student" name="name" ref={nameRef} onChange={(e) => setName(e.target.value)}>
            {data.filter((student) => student.classGrade == classGrade).map((student) => <option key={student.rollNumber} value={student.name}>{student.name}</option>)}
          </select>
        </div>
        <div className="form-group mb-3">
          <label htmlFor="rollNumberAndGuardian">Roll Number and Guardian Name</label>
          <select className="form-select" aria-label="Select Roll Number & Guardian Name" ref={rollNumberRef} name="rollNumberAndGuardian" onChange={e => setRollNumber(e.target.value)}>
            {filterData().map((student) => <option key={student.rollNumber} value={student.rollNumber}>{student.rollNumber} & {student.fatherName}</option>)}
          </select>
        </div>
      </form>
      {rollNumber != 0 ? <StudentInfoDisplay student={data.find((student) => student.rollNumber == rollNumber)} fetchData={props.fetchData} /> : null}
    </>
  );
}

function StudentInfoDisplay(props) {
  let student = props.student
  let [moreDetails, setMoreDetails] = useState(false)
  let [depositingFees, setDepositingFees] = useState(false)
  let [amountToDeposit, setAmountToDeposit] = useState(0)
  function depositFees() {
    if (amountToDeposit == 0) return alert('Please enter an amount to deposit')
    let confirmDeposit = window.confirm(`Are you sure you want to deposit Rs.${amountToDeposit} for ${student.name} (${student.rollNumber})`)
    if (confirmDeposit) {
      axios.post("http://localhost:3000/api/depositFees", { rollNumber: student.rollNumber, amountToDeposit, dateOfDeposit: getDate() }).then((response) => { console.log(response.data) }).then(() => setDepositingFees(false)).then(() => setAmountToDeposit(0)).then(() => alert('Fees deposited successfully')).then(() => props.fetchData())
    }
    else {
      setAmountToDeposit(0)
      setDepositingFees(false)
    }
  }
  function getDate() {
    var currentdate = new Date();
    var datetime = currentdate.getDate() + "/"
      + (currentdate.getMonth() + 1) + "/"
      + currentdate.getFullYear() + " @ "
      + currentdate.getHours() + ":"
      + currentdate.getMinutes() + ":"
      + currentdate.getSeconds();
    return datetime;
  }
  function getDepositTotal() {
    let deposits = []
    if (student.deposits) {
      for (let i = 0; i < student.deposits.length; i++) {
        deposits.push(student.deposits[i][0])
      }
    }
    return deposits.reduce((partialSum, a) => Number(partialSum) + Number(a), 0)
  }
  function getTransactionHistory() {
    return (
      <>
        <table className="table table-striped text-center table-sm">
          <thead className="">
            <tr>
              <th colSpan="2">Fees Transactions History</th>
            </tr>
            <tr className="table-dark">
              <th scope="col">Amount</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            {student.deposits ? student.deposits.map((deposit, key) => <tr key={key}><td>{deposit[0]}</td><td>{deposit[1]}</td></tr>) : null}
          </tbody>
        </table>
      </>
    )
  }
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">{student.name}</h5>
        <h6 className="card-subtitle mb-2 text-muted">{student.rollNumber}</h6>
        <p className="card-text">Guardian Name: {student.fatherName}</p>
        <p className="card-text">Phone: <a href={`tel:${student.contactNumbers}`}>&#128222;{student.contactNumbers}</a></p>
        <p className="card-text">Fees Pending: {Number(student.feesPending2122 ? student.feesPending2122 : 0 + student.feesPending2223 ? student.feesPending2223 : 0) - (student.deposits ? getDepositTotal() : 0)}</p>
        {moreDetails ? (<>
          <p className="card-text">Mother Name: {student.motherName}</p>
          <p className="card-text">Aadhaar Number: {student.aadhaarNumber}</p>
          <p className="card-text">SRN: {student.srn}</p>
          {student.deposits ? getTransactionHistory() : null}
        </>
        ) : null}
        <div className="text-center">
        <button className="btn btn-primary mb-3 " onClick={() => setMoreDetails(!moreDetails)}>{moreDetails ? 'Show Less Details' : 'Show More Details'}</button><br></br>
          {depositingFees ? (
          <>
            <div className="input-group mb-3">
              <div className="input-group-prepend">
                <span className="input-group-text">Rs.</span>
              </div>
              <input type="number" autoFocus className="form-control" onChange={(e) => setAmountToDeposit(e.target.value)} placeholder='Amount'></input>
            </div><button className="btn btn-success mr-3" onClick={() => depositFees()}>Deposit</button> <button className="btn btn-danger mr-3" onClick={() => setDepositingFees(false)}>Cancel</button>
          </>
          ) : <><button className="btn btn-success" onClick={() =>setDepositingFees(true)}>New Fees Deposit</button></>}
          </div>
      </div>
      </div>
  )
}

export default App;
