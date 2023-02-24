import { useEffect, useState, useRef } from "react";
import * as Realm from "realm-web";
import logoIcon from './/images/logoIcon.ico'

async function getUser() {
  const app = new Realm.App({ id: "application-1-kaqni" });
  const credentials = Realm.Credentials.anonymous();
  try {
    const user = await app.logIn(credentials);
    return user;
  } catch (err) {
    console.error("Failed to log in", err);
  }
}

function App() {
  let [api, setApi] = useState({});
  let [data, setData] = useState([]);
  async function fetchData() {
    api= await getUser()
    let students= await api.functions.firstCheck('getStudentsInfo')
    setData(students);
    setApi(api)
  }
  useEffect(() => { fetchData(); }, []);
  return (
    <div className="container">
      <Navbar />
      <CheckDataByAdmin data={data} fetchData={fetchData} api={api} />
      <ScrollToTopButton />
    </div>
  );
}

function CheckDataByAdmin(props) {
  const classGradeRef = useRef(0);
  const nameRef = useRef("");
  const rollNumberRef = useRef('');

  let data = props.data;
  let api=props.api
  let classGrades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  let [name, setName] = useState("")
  let [classGrade, setClassGrade] = useState(0)
  let [rollNumber, setRollNumber] = useState(0)

  useEffect(() => setName(nameRef.current.value), [classGrade])
  useEffect(() => setRollNumber(rollNumberRef.current.value), [name])

  function filterData() {
    let filteredData = data.filter((student) => (student ? (student.classGrade == classGrade) : true) && (name ? (student.name == name) : true))
    return filteredData
  }

  return (
    <>
      <form>
        <div className="form-group mb-3">
          <label htmlFor="classGrade">Class</label>
          <select className="form-select" aria-label="Select Class" name="classGrade" ref={classGradeRef} onChange={(e) => setClassGrade(e.target.value)}>
            {data.length > 0 ? (classGrade == 0 ? <option>Select Class</option> : null) : <option>Loading Data...</option>}
            {data.length > 0 ? (classGrades.map((grade) => <option key={grade} value={grade}>{grade}</option>)) : null}
          </select>
        </div>
        {classGrade && classGrade > 0 ? <div className="form-group mb-3">
          <label htmlFor="name">Name</label>
          <select className="form-select" aria-label="Select Student" name="name" ref={nameRef} onChange={(e) => setName(e.target.value)}>
            {data.filter((student) => student.classGrade == classGrade).map((student) => <option key={student.rollNumber} value={student.name}>{student.name}</option>)}
          </select>
        </div> : null}
        {name && name.length > 0 ? <div className="form-group mb-3">
          <label htmlFor="rollNumberAndGuardian">Roll Number and Guardian Name</label>
          <select className="form-select" aria-label="Select Roll Number & Guardian Name" ref={rollNumberRef} name="rollNumberAndGuardian" onChange={e => setRollNumber(e.target.value)}>
            {filterData().map((student) => <option key={student.rollNumber} value={student.rollNumber}>{student.rollNumber} & {student.fatherName}</option>)}
          </select>
        </div> : null}
      </form>
      {(rollNumber && rollNumber != 0) ? <StudentInfoDisplay student={data.find((student) => student.rollNumber == rollNumber)} fetchData={props.fetchData}  api={api}/> : null}
    </>
  );
}

function StudentInfoDisplay(props) {
  let api=props.api
  let student = props.student
  let [moreDetails, setMoreDetails] = useState(false)
  let [depositingFees, setDepositingFees] = useState(false)
  let [updatingPhoneNumber, setUpdatingPhoneNumber] = useState(false)
  let [contactNumber, setContactNumber] = useState('')
  let contactNumberRef = useRef('')
  let amountToDepositRef = useRef(0)
  useEffect(() => { setUpdatingPhoneNumber(false); setContactNumber('') }, [student.contactNumbers])
  useEffect(() => { setUpdatingPhoneNumber(false); setDepositingFees(false) }, [student.rollNumber])
  function depositFees() {
    if (amountToDepositRef.current.value == 0) return alert('Please enter an amount to deposit')
    let confirmDeposit = window.confirm(`Are you sure you want to deposit Rs.${amountToDepositRef.current.value} for ${student.name} (${student.rollNumber})`)
    async function deposit() {
      let deposited=await api.functions.firstCheck('depositFees', { rollNumber: student.rollNumber, amountToDeposit: amountToDepositRef.current.value, dateOfDeposit: getDate() })
      setDepositingFees(false)
      setUpdatingPhoneNumber(false)
      alert('Fees deposited successfully')
      props.fetchData()
    }
    if (confirmDeposit) deposit()
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
  function updatePhoneNumber() {
    if (contactNumber == '') return alert('Please enter a phone number')
    let confirmUpdate = window.confirm(`Are you sure you want to update the phone number for ${student.name} (${student.rollNumber}) to ${contactNumber}`)
    async function update() {
      await api.functions.firstCheck('updatePhoneNumber', { rollNumber: student.rollNumber, contactNumber })
      setUpdatingPhoneNumber(false)
      setContactNumber('')
      alert('Phone number updated successfully')
      props.fetchData()
    }
    if (confirmUpdate) update()
  }

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">{student.name}</h5>
        <h6 className="card-subtitle mb-2 text-muted">{student.rollNumber}</h6>
        <p className="card-text">Guardian Name: {student.fatherName}</p>
        {updatingPhoneNumber ?
          (<p className="card-text">Phone <input type="number" autoFocus ref={contactNumberRef} onChange={(e) => setContactNumber(e.target.value)} placeholder='New Phone Number' onKeyDown={(e) => { if (e.key === 'Enter') updatePhoneNumber() }}></input><button type="button" className="btn btn-success me-1 ms-1 m-auto" onClick={() => updatePhoneNumber()}>Save</button><button type="button" className="btn btn-danger" onClick={() => { setUpdatingPhoneNumber(false); setContactNumber(''); }}>Cancel</button></p>)
          : (<p className="card-text">Phone: {student.contactNumbers ? <a style={{ textDecoration: 'none' }} href={`tel:${student.contactNumbers}`}>&#128222;{student.contactNumbers}</a> : null}<button type="button" className="btn btn-warning ms-3" onClick={() => setUpdatingPhoneNumber(true)}>Update</button> </p>)}
        <p className="card-text">Fees Pending: {Number(student.feesPending2122 ? student.feesPending2122 : 0 + student.feesPending2223 ? student.feesPending2223 : 0) - (student.deposits ? getDepositTotal() : 0)}</p>
        {moreDetails ? (<>
          <p className="card-text">Mother Name: {student.motherName}</p>
          <p className="card-text">Aadhaar Number: {student.aadhaarNumber}</p>
          <p className="card-text">SRN: {student.srn}</p>
          {student.deposits ? getTransactionHistory() : null}
        </>
        ) : null}
        <div className="text-center">
          <button className="btn btn-primary mb-3 " onClick={() => setMoreDetails(!moreDetails)}>{moreDetails ? 'Show Less Details ↑' : 'Show More Details ↓'}</button><br></br>
          {depositingFees ? (
            <>
              <div className="input-group mb-3">
                <div className="input-group-prepend">
                  <span className="input-group-text">Rs.</span>
                </div>
                <input type="number" autoFocus className="form-control" ref={amountToDepositRef} onKeyDown={(e) => { if (e.key === 'Enter') depositFees() }} placeholder='Amount'></input>
              </div>
              <button className="btn btn-success mr-3" onClick={() => depositFees()}>Deposit</button> <button className="btn btn-danger mr-3" onClick={() => { setDepositingFees(false) }}>Cancel</button>
            </>
          ) : <><button className="btn btn-success" onClick={() => setDepositingFees(true)}>New Fees Deposit</button></>}
        </div>
        <div className="text-center">
        </div>
      </div>
    </div>
  )
}

function Navbar() {
  return (
    <nav className="navbar sticky-top" style={{ backgroundColor: 'white' }} >
      <a className="navbar-brand" href="#">
        <img src={logoIcon} width="30" height="30" className="d-inline-block align-top" alt=""></img>
        DR School Information Management
      </a>
    </nav>
  )
}

function ScrollToTopButton() {
  const [showScroll, setShowScroll] = useState(false)
  const checkScrollTop = () => {
    if (!showScroll && window.pageYOffset > 40) {
      setShowScroll(true)
    } else if (showScroll && window.pageYOffset <= 40) {
      setShowScroll(false)
    }
  };
  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  window.addEventListener('scroll', checkScrollTop)
  return (
    <button className="scrollTop btn btn-outline-success" type="button" onClick={scrollTop} style={{ display: showScroll ? 'block' : 'none', position: 'fixed', bottom: '20px', right: '20px', }}>↑</button>
  );
}

export default App;
