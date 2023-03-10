import { useEffect, useState, useRef, createContext, useContext, useMemo } from "react";
import * as Realm from "realm-web";
import { isMobile } from 'react-device-detect';
import 'react-datepicker/dist/react-datepicker.css';
import { Form, Button, Table, InputGroup, Container, FloatingLabel, Row } from 'react-bootstrap';
import { BsSave } from 'react-icons/bs';
import { useRoutes, Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import logoIcon from './/images/logoIcon.ico'
import './/images/printStyles.css'

const OurContext = createContext(null)
function useQuery() {
  const { search } = useLocation();

  return useMemo(() => new URLSearchParams(search), [search]);
}
const {
  BSON: { ObjectId },
} = Realm;

function App() {
  const [client, setClient] = useState(null)
  const [app, setApp] = useState(new Realm.App({ id: process.env.REACT_APP_REALM_APP_ID }))
  const [user, setUser] = useState(app.currentUser)
  const [data, setData] = useState([])

  function updateData() {
    client.db('school').collection('students').find().then((res) => { setData(res) }).catch((e) => { console.log(e) })
  }

  useEffect(() => {
    if (!client && user) {
      setClient(app.currentUser.mongoClient("mongodb-atlas"))
    }
    if (client) {
      updateData()
    }
  }, [user, client])

  let routes = useRoutes([
    { path: '/', element: user && user.isLoggedIn && user._profile.data.email ? user._profile.data.email != 'avisaharan1@gmail.com' ? <MarksEntry /> : <div className="container">{console.log(user)}<Navbar /><CheckDataByAdmin /></div> : <div className="container"><Navbar /><Authenticate /> </div> },
    { path: '/print', element: <PrintLayout /> },
    { path: '/resetpassword', element: <Authenticate /> },
    { path: '/settingNewPassword', element: <Authenticate /> },
    { path: '/forstudent', element: <ForStudent /> },
    { path: '/syncMongo', element: <SyncMongo /> },
    { path: '/marksEntry', element: <MarksEntry /> },
    { path: '/*', element: <Navigate to="/" /> }
    //{ path: '/', element: <Navigate to="/" /> }
  ])
  return (
    <OurContext.Provider value={{
      client,
      user,
      setUser,
      app,
      data,
      updateData
    }}>
      {routes}
    </OurContext.Provider>
  );
}

function Authenticate() {
  let { setUser, app } = useContext(OurContext)
  let [type, setType] = useState('login')
  let [error, setError] = useState('')
  let thisEmail = useRef()
  let [token, setToken] = useState('')
  let [tokenId, setTokenId] = useState('')
  let url = window.location.href;
  useEffect(() => {
    setToken(getTokenAndTokenId('token=')); setTokenId(getTokenAndTokenId('tokenId='))
    if (app.currentUser && app.currentUser.isLoggedIn && app.currentUser._profile.data.email) {
      <Navigate to="/" />
    }
    else {
      app.currentUser && app.currentUser.logOut()
    }
  }, [])
  useEffect(() => { confirmUser() }, [token, tokenId])
  //Navigate to home page if user is logged in

  function getTokenAndTokenId(start_str) {
    const start_index = url.indexOf(start_str);
    // If the start string isn't found, return an empty string
    if (start_index === -1) {
      return "";
    }
    // Find the index of the end character
    const end_index = url.indexOf('&', start_index + start_str.length);
    // If the end character isn't found, return the substring from the start index to the end of the string
    if (end_index === -1) {
      return url.substring(start_index + start_str.length);
    }
    // Return the substring from the start index to the end index
    return url.substring(start_index + start_str.length, end_index);
  }
  function confirmUser() {
    if (url.includes('/settingNewPassword') && token && tokenId) {
      setType('settingNewPassword')
    }
    else if (token && tokenId) {
      app.emailPasswordAuth.confirmUser({ token, tokenId }).then((user) => {
        setError({ text: "Email Confimed! Please sign in to continue", type: "success" })
      }).catch((e) => { setError({ text: e.error, type: "danger" }) })
    }
    return
  }
  function resendConfirmationEmail(email) {
    setError({ text: 'Sending Email...', type: "info" })
    app.emailPasswordAuth.resendConfirmationEmail({ email }).then((user) => { setError({ text: 'Email sent! Please check your inbox', type: "success" }); setTimeout(() => setError(''), [3000]) }).catch((e) => { setError({ text: e.error, type: "danger" }) })
  }
  let handleSubmit = async (e) => {
    e.preventDefault()
    let email = e.target.email.value.toLowerCase()
    let password = e.target.password && e.target.password.value.toLowerCase()
    let confirmPassword = e.target.confirmPassword ? e.target.confirmPassword.value.toLowerCase() : null
    if (type == 'login') {
      setError({ text: 'Loading...', type: "info" })
      app.logIn(Realm.Credentials.emailPassword(email, password)).then((user) => setUser(user)).catch((e) => { setError({ text: e.error, type: "danger" }); })
    }
    if (type == 'register') {
      if (password != confirmPassword) {
        setError({ text: 'Passwords do not match', type: 'danger' })
        setTimeout(() => {
          setError('')
        }, 3000)
        return
      }
      setError({ text: 'Loading...', type: "success" })
      if (email.includes("@drmschool.ac.in")) {
        app.emailPasswordAuth.registerUser({ email, password }).then(() => { setError({ text: 'Email sent! Please confirm your email to continue', type: "success" }) }).catch((e) => {
          if (e.error == 'name already in use') {
            setError({ text: 'Email already in use, please login', type: "danger" })
          }
        })
      }
      else {
        setError({ text: 'Please use your school email to register', type: "danger" })
      }
    }
    if (type == 'forgotPassword') {
      app.emailPasswordAuth.sendResetPasswordEmail({ email: thisEmail.current.value }).then(() => { setError({ text: 'Email sent! Please check your email to continue', type: "success" }); setTimeout(() => setError(''), [3000]) }).catch((e) => { setError({ text: e.error, type: "danger" }) })
    }
    if (type == 'settingNewPassword') {
      app.emailPasswordAuth.resetPassword({
        password,
        token,
        tokenId,
      }).then((user) => {
        setError({ text: "Password Changed! Please sign in to continue", type: "success" })
        setType('login')
        handleSubmit(e)
      }
      ).catch((e) => { setError({ text: e.error, type: "danger" }) })
    }
  }
  function showError() {
    if (error) {
      return (
        <div className={`alert alert-dismissible alert-${error.type}`}>
          <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
          <strong>{error.text}</strong></div>
      )
    }
  }

  return (
    <div className="row">
      <div className="col-md-6 offset-md-3">
        <div className="card">
          <div className="card-body">
            <h1 className="text-center">Login</h1>
            <form onSubmit={handleSubmit}>
              <FloatingLabel className='mb-3' label="Username">
                <Form.Control placeholder="Username" name="email" ref={thisEmail} />
              </FloatingLabel>
              {!(type == 'forgotPassword') && <FloatingLabel className='mb-3' label="Password">
                <Form.Control type="password" placeholder={type == 'settingNewPassword' ? "New Password" : "Password"} name="password" />
              </FloatingLabel>}
              {type == 'register' ?
                <FloatingLabel className='mb-3' label="Confirm Password">
                  <Form.Control type="password" placeholder="Confirm Password" name="confirmPassword" />
                </FloatingLabel>
                : null}
              <div className="form-group mb-3">
                <button type="submit" className="btn btn-primary">{type == 'login' ? 'Login' : type == 'register' ? 'Register' : type == 'forgotPassword' ? "Send Reset Link" : type == 'settingNewPassword' ? "Set New Password" : null}</button>
              </div>
              <div className="form-group mb-3">

                {type == 'login' ? <div className="d-flex justify-content-between">
                  <div>
                    <Link to="#" onClick={() => setType('register')}>Register</Link>
                  </div>
                  <div>
                    <Link to="#" onClick={() => setType('forgotPassword')}>Forgot Password</Link>
                  </div>
                </div> : type == 'register' ? <div className="d-flex justify-content-between">
                  <div>
                    <Link to="#" onClick={() => setType('login')}>Login</Link>
                  </div>
                  <div>
                    <Link to="#" onClick={() => setType('forgotPassword')}>Forgot Password</Link>
                  </div>
                </div> : <div className="d-flex justify-content-between">
                  <div>
                    <Link to="#" onClick={() => setType('login')}>Login</Link>
                  </div>
                  <div>
                    <Link to="#" onClick={() => setType('register')}>Register</Link>
                  </div>
                </div>}
              </div>
              {showError()}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckDataByAdmin() {
  let { data, user } = useContext(OurContext)
  const classGradeRef = useRef(0);
  const nameRef = useRef("");
  const rollNumberRef = useRef('');
  let classGrades = ['Nursery', 'KG', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
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
        <FloatingLabel controlId="floatingSelect" label="Class" className="mb-3">
          <Form.Select name="classGrade" aria-label="Select Class" ref={classGradeRef} onChange={(e) => { setClassGrade(e.target.value) }}>
            {data && data.length > 0 ? (classGrade == 0 ? <option>Select Class</option> : null) : <option>Loading Data...</option>}
            {data && data.length > 0 ? (classGrades.map((grade) => <option key={grade} value={grade}>{grade}</option>)) : null}
          </Form.Select>
        </FloatingLabel>
        {classGrade ?
          <FloatingLabel controlId="floatingSelect" label="Name" className="mb-3">
            <Form.Select aria-label="Select Student" ref={nameRef} onChange={(e) => setName(e.target.value)}>
              {data && data.filter((student) => student.classGrade == classGrade).map((student) => <option key={student.rollNumber} value={student.name}>{student.name}</option>)}
            </Form.Select>
          </FloatingLabel> : null}
        {name && name.length > 0 ?
          <FloatingLabel controlId="floatingSelect" label="Roll Number and Guardian Name" className="mb-3">
            <Form.Select aria-label="Roll Number and Guardian Name" ref={rollNumberRef} onChange={e => setRollNumber(e.target.value)}>
              {data && filterData().map((student) => <option key={student.rollNumber} value={student.rollNumber}>{student.rollNumber} & {student.fatherName}</option>)}
            </Form.Select>
          </FloatingLabel> : null}
      </form>
      {rollNumber && rollNumber != 0 && <StudentInfoDisplay student={data.find((student) => student.rollNumber == rollNumber)} />}
    </>
  );
}

function StudentInfoDisplay({ student }) {
  let { updateData, client } = useContext(OurContext)
  let [moreDetails, setMoreDetails] = useState(false)
  let [depositingFees, setDepositingFees] = useState(false)
  let collection = client.db('school').collection('students')
  let amountToDepositRef = useRef(0)
  let feesDepositCancelRef = useRef('')
  let updateCancelRef = useRef('')
  let [newContactNumber, setNewContactNumber] = useState([])
  let [updatingContactNumber, setUpdatingContactNumber] = useState()
  let [settingNewContactNumber, setSettingNewContactNumber] = useState()
  let [savingContact, setSavingContact] = useState(false)

  useEffect(() => { setDepositingFees(false); setUpdatingContactNumber(false); setMoreDetails(false); }, [student.rollNumber])
  useEffect(() => {
    setNewContactNumber('')
    setSettingNewContactNumber(false)
    setUpdatingContactNumber(false)
  }, [student.contactNumbers])
  useEffect(() => { if (depositingFees) feesDepositCancelRef.current.scrollIntoView() }, [depositingFees])
  function depositFees() {
    function getDate() {
      var currentdate = new Date();
      var datetime = currentdate.getDate() + "/"
        + (currentdate.getMonth() + 1) + "/"
        + currentdate.getFullYear() + " @ "
        + currentdate.getHours() + ":"
        + currentdate.getMinutes()
      return datetime;
    }
    if (amountToDepositRef.current.value == 0) {
      alert('Please enter an amount to deposit')
      amountToDepositRef.current.focus()
      return
    }
    let confirmDeposit = window.confirm(`Confirm deposit Rs.${amountToDepositRef.current.value} on ${getDate()} for ${student.name} (${student.rollNumber})`)
    async function deposit() {
      collection.updateOne(
        { rollNumber: student.rollNumber },
        { $push: { deposits: { amount: Number(amountToDepositRef.current.value), date: getDate() } } }
      ).then(() => { setDepositingFees(false); alert('Fees deposited successfully'); updateData() }).catch((err) => alert(err))
    }
    if (confirmDeposit) deposit()
  }
  function getDepositTotal() {
    let deposits = []
    if (student.deposits) {
      for (let i = 0; i < student.deposits.length; i++) {
        deposits.push(student.deposits[i].amount)
      }
    }
    return deposits.reduce((partialSum, a) => Number(partialSum) + Number(a), 0)
  }
  function getTransactionHistory() {
    function getTransactionTotal() {
      let transactions = []
      if (student.deposits) {
        for (let i = 0; i < student.deposits.length; i++) {
          transactions.push(student.deposits[i].amount)
        }
      }
      return transactions.reduce((partialSum, a) => Number(partialSum) + Number(a), 0)
    }
    return (
      <>
        <table className="table table-striped table-sm">
          <thead className="">
            <tr>
              <th colSpan="2" style={{ textAlign: 'center' }}>Fees Transactions History</th>
            </tr>
            <tr className="table-dark">
              <th scope="col">Date</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {student.deposits.map((deposit, key) => <tr key={key}><td>{deposit.date}</td><td>{deposit.amount}</td></tr>)}
            {student.deposits.length > 1 ? <tr className="table-dark"><td>Total Deposits</td><td>{getTransactionTotal()}</td></tr> : null}
          </tbody>
        </table>
      </>
    )
  }
  //display contact numbers with telephone anchor tags, with update and remove icons. When clicked on update icon, it will turn that specific contact number anchor into input box to update that contact number with an update button, which when clicked will call updateContactNumber function with contact number that is being updated and new contact number in input field as arguments. When clicked on remove icon, it will call removeContactNumber function to remove that specific contact number from database. If no contact number is present, it will show button to add contact number, which when clicked will show an input box below the contacts currently present and add button to call addContactNumber function with the new contact number that is in the input field as argument 
  function contactNumbersSpace() {
    //add contact number to database
    function addContactNumber(newContactNumber) {
      if (newContactNumber.length == 0) return alert('Please enter a contact number')
      setSavingContact(true)
      collection.updateOne(
        { rollNumber: student.rollNumber },
        { $push: { contactNumbers: newContactNumber } }
      ).then(() => { updateData(); setSavingContact(false) }).catch((err) => alert(err))
    }
    //remove contact number from database
    async function removeContactNumber(oldContactNumber) {
      if (!(window.confirm(`Confirm removing ${oldContactNumber} for ${student.name} (${student.rollNumber})`))) return

      collection.updateOne(
        { rollNumber: student.rollNumber },
        { $set: { contactNumbers: student.contactNumbers.filter((contactNumber) => contactNumber != oldContactNumber) } }
      ).then(() => { updateData() }).catch((err) => alert(err))
    }
    //update contact number in database
    function updateContactNumber(oldContactNumber, newContactNumber) {
      if (newContactNumber.length == 0) return alert('Please enter a contact number')
      setSavingContact(true)
      collection.updateOne(
        { rollNumber: student.rollNumber },
        { $set: { contactNumbers: student.contactNumbers.map((contactNumber) => contactNumber == oldContactNumber ? newContactNumber : contactNumber) } }
      ).then(() => { updateData(); setSavingContact(false) }).catch((err) => alert(err))
    }

    //if no contact number is present, show button to add contact number, which when clicked will show an input box below the contacts currently present and add button to call addContactNumber function with the new contact number that is in the input field as argument
    function addContactNumberInput() {
      return (

        <>
          {!savingContact &&
            <div className="input-group mb-3">
              <div className="input-group-prepend">
                <span className="input-group-text">+91 </span>
              </div>
              <input type="number" autoFocus className="form-control" placeholder="Contact Number" onChange={(e) => setNewContactNumber(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addContactNumber(newContactNumber) }} />
              <div className="input-group-append">
                <button className="btn btn-success" onClick={() => addContactNumber(newContactNumber)} >Add</button>
                <button className="btn btn-danger" onClick={() => setSettingNewContactNumber(false)} >Cancel</button>
              </div>
            </div>}
        </>
      )
    }
    //if contact number is present, show contact numbers with telephone anchor tags, with update and remove icons. When clicked on update icon, it will turn that specific contact number anchor into input box to update that contact number with an update button, which when clicked will call updateContactNumber function with contact number that is being updated and new contact number in input field as arguments. When clicked on remove icon, it will call removeContactNumber function to remove that specific contact number from database
    function contactNumbers() {
      return (
        <>
          {student.contactNumbers.map((contactNumber, key) => {
            return (
              <div key={key}>
                {!(updatingContactNumber == contactNumber) ? <>
                  <div className="mb-1">
                    <button className="btn btn-outline-info btn-sm"><a style={{ textDecoration: "none" }} href={`tel:${contactNumber}`} className="card-link">????{contactNumber}</a></button>
                    <button className="btn btn-outline-warning mx-1 btn-sm" onClick={() => { setUpdatingContactNumber(contactNumber) }}>Edit</button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => removeContactNumber(contactNumber)}>Delete</button>
                  </div></> : (<>
                    {!savingContact &&
                      <div className="input-group mb-3">
                        <div className="input-group-prepend">
                          <span className="input-group-text">+91 </span>
                        </div>
                        <input type="number" autoFocus
                          onFocus={() => {
                            if (updateCancelRef.current) updateCancelRef.current.scrollIntoView()
                            setNewContactNumber(contactNumber)
                          }} onKeyDown={(e) => { if (e.key === 'Enter') updateContactNumber(contactNumber, newContactNumber) }} className="form-control" value={newContactNumber} onChange={(e) => setNewContactNumber(e.target.value)} />

                        <button className="btn btn-success" onClick={() => { updateContactNumber(contactNumber, newContactNumber); }}>Save</button>
                        <button className="btn btn-danger" onClick={() => { setUpdatingContactNumber(false); }}>Cancel</button><span ref={updateCancelRef}></span>

                      </div>
                    }
                  </>
                )}


              </div>
            )
          })}
        </>
      )
    }
    //show all contacts and add contact number input
    function contactsDisplay() {
      return (
        <>
          {student.contactNumbers && student.contactNumbers.length > 0 && contactNumbers()}
          {settingNewContactNumber ? addContactNumberInput() : null}
          {!settingNewContactNumber ? <button className="btn btn-outline-success btn-sm" onClick={() => setSettingNewContactNumber(!settingNewContactNumber)}>Add New</button>
            : null}</>
      )
    }
    return contactsDisplay()
  }
  // function to update studentInfo state object when user enters data
  const handlePrint = () => {
    const printContents = document.getElementById('receipt').innerHTML;
    const popupWin = window.open('', '_blank', 'width=600,height=600');
    popupWin.document.open();
    popupWin.document.write(`
      <html>
        <head>
          <title>Fee Receipt</title>
          <style>
            @media print {
              body {
                width: 58mm;
                height: auto;
                font-family: Arial, sans-serif;
                font-size: 15px;
                font-weight: bold;
                margin: 0;
                padding: 10px;
                line-height: 1.2;
              }
              h1, h2, h3, h4, h5, h6 {
                margin: 0;
                line-height: 1.2;
              }
              h1 {
                font-size: 20px;
                font-weight: bold;
              }
              h2 {
                font-size: 17px;
                font-weight: bold;
              }
              hr {
                border: none;
                border-top: 1px solid black;
                margin: 10px 0;
              }
              p, span {
                margin: 0;
                line-height: 1.2;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 10px;
              }
              table, th, td {
                border: 1px solid black;
              }
              th, td {
                padding: 5px;
                text-align: left;
                line-height: 1.2;
              }
              th {
                background-color: #ddd;
              }
              tfoot td {
                text-align: right;
                font-weight: bold;
              }
            }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);
    popupWin.document.close();
    popupWin.print();
  };
  function getPendingFees(){
    let pending2122=0
    let pending2223=0
    console.log('Sibling: '+student.sibling.length)
    if(student.sibling && student.sibling.length>1){
      return(
        <>
          <p className="card-text">Fees with: {student.sibling}</p>
          </>
      )
    }
    if(student.feesPending2122 || student.feesPending2223) {
      if(student.feesPending2122) pending2122 = Number(student.feesPending2122)- Number((student.deposits ? getDepositTotal() : 0));
      if(student.feesPending2223){
        if(!pending2122) pending2223 = Number(student.feesPending2223) - Number((student.deposits ? getDepositTotal() : 0));
        else if(pending2122>0) pending2223 = Number(student.feesPending2223);
        else if(pending2122<=0) pending2223 = Number(student.feesPending2223) + Number(pending2122);
      }
    }
    return(
      <>
        {pending2122 && pending2122>0?<p className="card-text">Fees Pending 2021-22: {pending2122}</p>:null}
        <p className="card-text">Fees Pending 2022-23: {pending2223}</p>
      </>
    )
  }
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">{student.name}</h5>
        <h6 className="card-subtitle mb-2 text-muted">Roll: {student.rollNumber}</h6>
        <p className="card-text">Guardian Name: {student.fatherName}</p>
        <div className="card-text mb-3">Contact Numbers: {student.contactNumbers && contactNumbersSpace()} </div>
        {getPendingFees()}
        {moreDetails ? (
          <>
            <p className="card-text">Mother Name: {student.motherName}</p>
            <p className="card-text">Aadhaar Number: {student.aadhaarNumber}</p>
            <p className="card-text">SRN: {student.srn}</p>
            {student.deposits ? getTransactionHistory() : null}
          </>
        ) : null}
        <div className="row">
          <button className="btn btn-primary mb-2 mt-n3 " onClick={() => setMoreDetails(!moreDetails)}>{moreDetails ? 'Show Less Details ???' : 'Show More Details ???'}</button>
        </div>
        {depositingFees ? (
          <>
            <div className="input-group mb-3">
              <div className="input-group-prepend">
                <span className="input-group-text">Rs.</span>
              </div>
              <input type="number" autoFocus className="form-control" ref={amountToDepositRef} onFocus={() => { if (feesDepositCancelRef.current) feesDepositCancelRef.current.scrollIntoView() }} onKeyDown={(e) => { if (e.key === 'Enter') depositFees() }} placeholder='Amount'></input>
            </div>
            <div className="row">
              <button className="btn btn-success mb-1" onClick={() => depositFees()}>Deposit</button>
              <button className="btn btn-danger mb-1" onClick={() => { setDepositingFees(false) }}>Cancel</button>
            </div>
            <p ref={feesDepositCancelRef}></p>
          </>
        ) : <div className="row"><button className="btn btn-success" onClick={() => setDepositingFees(true)}>New Fees Deposit</button>   </div>}
        <div className="d-flex flex-column">
          <button className="btn btn-info mt-2" onClick={handlePrint}>Print Fees Receipt</button>
        </div>
        <div>
          <Receipt student={student} />

        </div>
      </div>
    </div>
  )
}

function Navbar() {
  let { user, app, setUser } = useContext(OurContext)
  return (
    <nav className="navbar navbar-expand-lg" >
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          <img src={logoIcon} width="30" height="30" className="d-inline-block align-top" alt=""></img>
          DR School - Internal
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link active" aria-current="page" to="/">Home</Link>
            </li>
            {!user &&
              <li className="nav-item">
                <Link className="nav-link active" aria-current="page" to="/forStudent">Guest Account</Link>
              </li>}
            <li className="nav-item">
              {user && user._profile.data.email ? <button className="btn btn-outline-danger" onClick={() => { app.currentUser.logOut(); setUser(null) }}>Logout {user._profile.data.email}</button> : null}
            </li>
          </ul>
        </div>
        <div className="d-flex">
        </div>
      </div>
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
    <button className="scrollTop btn btn-outline-success btn-lg" type="button" onClick={scrollTop} style={{ display: showScroll ? 'block' : 'none', position: 'fixed', bottom: '20px', right: '20px', }}>???</button>
  );
}

//Print layout for Student Information with styling for print.
function PrintLayout() {
  let query = useQuery()
  let student = query.get('student')
  student = JSON.parse(student)
  useEffect(() => { window.print() }, [])
  const { name, classGrade, rollNumber, contactNumbers, fatherName, motherName, deposits, studentResults, classInChargeRemarks } = student;
  return (
    <>
      <div className="student-info-container">
        <div className="school-info">
          <div className="logo">
            <img src={logoIcon} alt="ABC School Logo" />
          </div>
          <div className="school-details">
            <h1>DR Memorial School, Chautala</h1>
            <h4>Student Information</h4>
          </div>
        </div>

        <div className="personal-info">
          <div className="left">
            <p><strong>Name:</strong> {name}</p>
            <p><strong>Class:</strong> {classGrade}</p>
            <p><strong>Roll No.:</strong> {rollNumber}</p>
          </div>
          <div className="right">
            <p><strong>Father's Name:</strong> {fatherName}</p>
            <p><strong>Mother's Name:</strong> {motherName}</p>
            <p><strong>Contact:</strong> {contactNumbers && contactNumbers.join(', ')}</p>
          </div>
        </div>

        <div className="academic-info">
          <h3>Academic Result</h3>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {[{ subjectName: "Maths", grade: "xx" }, { subjectName: "Hindi ", grade: "xx" }, { subjectName: "English", grade: "xx" }].map((result, index) => (
                <tr key={index}>
                  <td>{result.subjectName}</td>
                  <td>{result.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="fees-info">
          <h3>Fee Deposits</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {deposits && deposits.map((deposit, index) => (
                <tr key={index}>
                  <td>{deposit.date}</td>
                  <td>{deposit.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="remarks-info">
          <h3>Class In-Charge Remarks</h3>
          <p>{"Very good"}</p>
        </div>
        <div className="row">
          <button type="button" className="print-button btn btn-secondary" onClick={() => window.print()}>Print</button>
        </div>
      </div>
    </>
  );
}

function Receipt({ student }) {
  console.log(student)
  const printTable = student.deposits && student.deposits.map((transaction) => (
    <tr key={transaction.date}>
      <td><strong>{transaction.date.split("@")[0]}</strong></td>
      <td><strong>{transaction.amount}</strong></td>
    </tr>
  ));

  const printContacts = student.contactNumbers && student.contactNumbers.map((contactNumber) => (
    <span key={contactNumber}>{contactNumber}<br /></span>
  ));
  const totalDeposits = student.deposits && student.deposits.reduce((acc, transaction) => acc + parseInt(transaction.amount), 0);
  const pendingAmount = student.feesPending2223 - totalDeposits;

  return (
    <div id="receipt" hidden>
      <h1>DR Memorial School</h1>
      <h2>Student Fees Receipt</h2>
      <hr />
      <p><strong>For:</strong> {student.name}</p>
      <p><strong>Class:</strong> {student.classGrade}</p>
      <p><strong>Roll Number:</strong> {student.rollNumber}</p>
      <p><strong>Guardian:</strong> {student.fatherName}</p>
      <p><strong>Contact: </strong>{printContacts}</p>
      <hr />
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {printTable}
        </tbody>
        <tfoot>
          <tr>
            <td><strong>Total:</strong></td>
            <td><strong>{totalDeposits}</strong></td>
          </tr>
        </tfoot>
      </table>
      <hr />
      <p><strong>Pending Fees:</strong> {pendingAmount}</p>
      <p><strong>Thank you for your support.</strong></p>
    </div>
  );
}

//check pendign fees by selecting class and name from dropdown and then entering date of birth for verification, similar layout to student info
function ForStudent() {
  const classGradeRef = useRef(0);
  const nameRef = useRef("");
  const rollNumberRef = useRef('');
  const dobRef = useRef('');
  let classGrades = ['Nursery', 'KG', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  let [name, setName] = useState("")
  let [classGrade, setClassGrade] = useState(0)
  let [rollNumber, setRollNumber] = useState(0)
  let [student, setStudent] = useState(null)
  const [client, setClient] = useState(null)
  const [app, setApp] = useState(new Realm.App({ id: process.env.REACT_APP_REALM_APP_ID }))
  const [user, setUser] = useState(app.currentUser)
  const [data, setData] = useState([])
  let [error, setError] = useState('')

  function updateData() {
    client.db('school').collection('students').find().then((res) => { setData(res) }).catch((e) => { console.log(e) })
  }

  useEffect(() => {
    if (!client && user) {
      setClient(app.currentUser.mongoClient("mongodb-atlas"))
    }
    if (client) {
      updateData()
    }
  }, [user, client])
  async function loginAnonymous() {
    // Create an anonymous credential
    const credentials = Realm.Credentials.anonymous();

    // Authenticate the user
    const user = await app.logIn(credentials);
    // `App.currentUser` updates to match the logged in user
    console.assert(user.id === app.currentUser.id);

    return user;
  }
  function InfoDisplay() {
    let { updateData, client } = useContext(OurContext)
    let [moreDetails, setMoreDetails] = useState(false)
    let [depositingFees, setDepositingFees] = useState(false)
    let amountToDepositRef = useRef(0)
    let feesDepositCancelRef = useRef('')
    let updateCancelRef = useRef('')
    let [newContactNumber, setNewContactNumber] = useState([])
    let [updatingContactNumber, setUpdatingContactNumber] = useState()
    let [settingNewContactNumber, setSettingNewContactNumber] = useState()
    let [savingContact, setSavingContact] = useState(false)
    let [feesPending, setFeesPending] = useState(0)
    function getDepositTotal() {
      let deposits = []
      if (student.deposits) {
        for (let i = 0; i < student.deposits.length; i++) {
          deposits.push(student.deposits[i].amount)
        }
      }
      return deposits.reduce((partialSum, a) => Number(partialSum) + Number(a), 0)
    }
    useEffect(() => {
      setDepositingFees(false); setUpdatingContactNumber(false); setMoreDetails(false); setFeesPending(
        Number(student.feesPending2122 ? student.feesPending2122 : 0 + student.feesPending2223 ? student.feesPending2223 : 0) - (student.deposits ? getDepositTotal() : 0)
      )
    }, [student.rollNumber])
    useEffect(() => {
      setNewContactNumber('')
      setSettingNewContactNumber(false)
      setUpdatingContactNumber(false)
    }, [student.contactNumbers])
    useEffect(() => { if (depositingFees) feesDepositCancelRef.current.scrollIntoView() }, [depositingFees])
    function depositFees() {
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
      if (amountToDepositRef.current.value == 0) {
        alert('Please enter an amount to deposit')
        amountToDepositRef.current.focus()
        return
      }
      let confirmDeposit = window.confirm(`Confirm deposit Rs.${amountToDepositRef.current.value} on ${getDate()} for ${student.name} (${student.rollNumber})`)
      async function deposit() {
        alert(`Please login using ${student.name}${student.classGrade}.${student.rollNumber}@drmschool.ac.in or using staff account for this action.`)
        setDepositingFees(false)
        return
      }
      if (confirmDeposit) deposit()
    }

    function getTransactionHistory() {
      function getTransactionTotal() {
        let transactions = []
        if (student.deposits) {
          for (let i = 0; i < student.deposits.length; i++) {
            transactions.push(student.deposits[i].amount)
          }
        }
        return transactions.reduce((partialSum, a) => Number(partialSum) + Number(a), 0)
      }
      return (
        <>
          <table className="table table-striped table-sm">
            <thead className="">
              <tr>
                <th colSpan="2" style={{ textAlign: 'center' }}>Fees Transactions History</th>
              </tr>
              <tr className="table-dark">
                <th scope="col">Date</th>
                <th scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {student.deposits.map((deposit, key) => <tr key={key}><td>{deposit.date}</td><td>{deposit.amount}</td></tr>)}
              {student.deposits.length > 1 ? <tr className="table-dark"><td>Total Deposits</td><td>{getTransactionTotal()}</td></tr> : null}
            </tbody>
          </table>
        </>
      )
    }
    //display contact numbers with telephone anchor tags, with update and remove icons. When clicked on update icon, it will turn that specific contact number anchor into input box to update that contact number with an update button, which when clicked will call updateContactNumber function with contact number that is being updated and new contact number in input field as arguments. When clicked on remove icon, it will call removeContactNumber function to remove that specific contact number from database. If no contact number is present, it will show button to add contact number, which when clicked will show an input box below the contacts currently present and add button to call addContactNumber function with the new contact number that is in the input field as argument 
    function contactNumbersSpace() {
      //add contact number to database
      function addContactNumber(newContactNumber) {
        if (newContactNumber.length == 0) return alert('Please enter a contact number')
        alert(`Please login using ${student.name}${student.classGrade}.${student.rollNumber}@drmschool.ac.in or using staff account for this action.`)
        setSettingNewContactNumber(false)
        return
      }
      //remove contact number from database
      async function removeContactNumber(oldContactNumber) {
        alert(`Please login using ${student.name}${student.classGrade}.${student.rollNumber}@drmschool.ac.in or using staff account for this action.`)
        setUpdatingContactNumber(false)
        return
      }
      //update contact number in database
      function updateContactNumber(oldContactNumber, newContactNumber) {
        if (newContactNumber.length == 0) return alert('Please enter a contact number')
        alert(`Please login using ${student.name}${student.classGrade}.${student.rollNumber}@drmschool.ac.in or using staff account for this action.`)
        setUpdatingContactNumber(false)
        return
      }

      //if no contact number is present, show button to add contact number, which when clicked will show an input box below the contacts currently present and add button to call addContactNumber function with the new contact number that is in the input field as argument
      function addContactNumberInput() {
        return (

          <>
            {!savingContact &&
              <div className="input-group mb-3">
                <div className="input-group-prepend">
                  <span className="input-group-text">+91 </span>
                </div>
                <input type="number" autoFocus className="form-control" placeholder="Contact Number" onChange={(e) => setNewContactNumber(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addContactNumber(newContactNumber) }} />
                <div className="input-group-append">
                  <button className="btn btn-success" onClick={() => addContactNumber(newContactNumber)} >Add</button>
                  <button className="btn btn-danger" onClick={() => setSettingNewContactNumber(false)} >Cancel</button>
                </div>
              </div>}
          </>
        )
      }
      //if contact number is present, show contact numbers with telephone anchor tags, with update and remove icons. When clicked on update icon, it will turn that specific contact number anchor into input box to update that contact number with an update button, which when clicked will call updateContactNumber function with contact number that is being updated and new contact number in input field as arguments. When clicked on remove icon, it will call removeContactNumber function to remove that specific contact number from database
      function contactNumbers() {
        return (
          <>
            {student.contactNumbers.map((contactNumber, key) => {
              return (
                <div key={key}>
                  {!(updatingContactNumber == contactNumber) ? <>
                    <div className="mb-1">
                      <button className="btn btn-outline-info btn-sm"><a style={{ textDecoration: "none" }} href={`tel:${contactNumber}`} className="card-link">????{contactNumber}</a></button>
                      <button className="btn btn-outline-warning mx-1 btn-sm" onClick={() => { setUpdatingContactNumber(contactNumber) }}>Edit</button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => removeContactNumber(contactNumber)}>Delete</button>
                    </div></> : (<>
                      {!savingContact &&
                        <div className="input-group mb-3">
                          <div className="input-group-prepend">
                            <span className="input-group-text">+91 </span>
                          </div>
                          <input type="number" autoFocus
                            onFocus={() => {
                              if (updateCancelRef.current) updateCancelRef.current.scrollIntoView()
                              setNewContactNumber(contactNumber)
                            }} onKeyDown={(e) => { if (e.key === 'Enter') updateContactNumber(contactNumber, newContactNumber) }} className="form-control" value={newContactNumber} onChange={(e) => setNewContactNumber(e.target.value)} />

                          <button className="btn btn-success" onClick={() => { updateContactNumber(contactNumber, newContactNumber); }}>Save</button>
                          <button className="btn btn-danger" onClick={() => { setUpdatingContactNumber(false); }}>Cancel</button><span ref={updateCancelRef}></span>

                        </div>
                      }
                    </>
                  )}


                </div>
              )
            })}
          </>
        )
      }
      //show all contacts and add contact number input
      function contactsDisplay() {
        return (
          <>
            {student.contactNumbers && student.contactNumbers.length > 0 && contactNumbers()}
            {settingNewContactNumber ? addContactNumberInput() : null}
            {!settingNewContactNumber ? <button className="btn btn-outline-success btn-sm" onClick={() => setSettingNewContactNumber(true)}>Add New</button>
              : null}</>
        )
      }
      return contactsDisplay()
    }
    function payLinkClick() {
      const upiLink = `upi://pay?pa=avisaharan1@dbs&am=${feesPending}&tr=${student.rollNumber}&tn=${student.name}%20Class: ${student.classGrade}%20Roll: ${student.rollNumber}`;
      const handleUpiClick = () => {
        window.location.href = upiLink;
      };
      handleUpiClick()
    }

    const BankDetailsTable = ({ bankAccountName, bankAccountNumber, bankIFSCCode, upiID }) => {
      return (
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Bank Account</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Name</td>
              <td>{bankAccountName}</td>
            </tr>
            <tr>
              <td>Number</td>
              <td>{bankAccountNumber}</td>
            </tr>
            <tr>
              <td>IFSC Code</td>
              <td>{bankIFSCCode}</td>
            </tr>
            <tr>
              <td>UPI ID</td>
              <td>{upiID}</td>
            </tr>
          </tbody>
        </Table>
      );
    };


    return (
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">{student.name}</h5>
          <h6 className="card-subtitle mb-2 text-muted">Roll: {student.rollNumber}</h6>
          <p className="card-text">Guardian Name: {student.fatherName}</p>
          <div className="card-text mb-3">Contact Numbers: {student.contactNumbers && contactNumbersSpace()} </div>
          <p className="card-text">Fees Pending: {feesPending}</p>
          {moreDetails ? (
            <>
              <p className="card-text">Mother Name: {student.motherName}</p>
              <p className="card-text">Aadhaar Number: {student.aadhaarNumber}</p>
              <p className="card-text">SRN: {student.srn}</p>
              {student.sibling && student.sibling != ' ' && student.sibling != '  ' ? <p className="card-text">Sibling: {student.sibling}</p> : null}
              {student.deposits ? getTransactionHistory() : null}
            </>
          ) : null}
          <div className="row">
            <button className="btn btn-primary mb-2 mt-n3 " onClick={() => setMoreDetails(!moreDetails)}>{moreDetails ? 'Show Less Details ???' : 'Show More Details ???'}</button>
          </div>
          {depositingFees ? (
            // isMobile && window.navigator.share
            5 == 5 ?
              <>
                <div className="input-group mb-3">
                  <div className="input-group-prepend">
                    <span className="input-group-text">Rs.</span>
                  </div>
                  <input type="number" autoFocus className="form-control" ref={amountToDepositRef} onFocus={() => { if (feesDepositCancelRef.current) feesDepositCancelRef.current.scrollIntoView() }} onKeyDown={(e) => { if (e.key === 'Enter') depositFees() }} placeholder='Amount'></input>
                </div>
                <div className="row">
                  <button className="btn btn-success mb-1" onClick={payLinkClick}>Pay</button>
                  {/* <button className="btn btn-success mb-1" onClick={() => depositFees()}>Deposit</button> */}
                  <button className="btn btn-danger mb-1" ref={feesDepositCancelRef} onClick={() => { setDepositingFees(false) }}>Cancel</button>
                </div>
              </> : <>

                <div className={`alert alert-dismissible alert-info mt-3`}>
                  <p>We currently only support online payments on mobile devices with UPI app installed. Please use direct transfer instead:</p>
                  {BankDetailsTable({ bankAccountName: 'DR Memorial High School', bankAccountNumber: '38093269020', bankIFSCCode: 'SBIN0004599', upiID: '38093269020@SBIN0004599.ifsc.npci or avisaharan1@dbs' })}
                </div>
              </>

          ) : <div className="row"><button className="btn btn-success" onClick={() => setDepositingFees(true)}>New Fees Deposit</button>   </div>}

          <div className="d-flex flex-column">
            <Link to={`/print?student=${JSON.stringify(student)}`} target='_blank' className='d-flex justify-content-center'><button type="button" className="print-button btn btn-info mt-2">Print</button></Link>
          </div>
        </div>
      </div>
    )
  }

  function filterData() {
    let filteredData = data.filter((student) => (student ? (student.classGrade == classGrade) : true) && (name ? (student.name == name) : true))
    return filteredData
  }
  useEffect(() => {
    if (!user)
      loginAnonymous().then((user) => setUser(user))
  }, [])
  useEffect(() => { setRollNumber(rollNumberRef.current.value) }, [classGrade])
  function handleSubmit(e) {
    e.preventDefault()
    let filteredData = filterData()
    let student = filteredData.find((student) => student.rollNumber == rollNumber)
    if (student) {
      console.log(student)
      if (!student.dob) {
        setError({ type: 'danger', text: "Your date of birth is not registered with us. Please contact the school office." })
        setTimeout(() => setError(null), 5000)
        return
      }
      let dateOriginal = student.dob.toString().split("-").reverse()
      let dateRef = dobRef.current.value.split("-")
      if (Number(dateOriginal[0]) == Number(dateRef[0]) && Number(dateOriginal[1]) == Number(dateRef[1]) && Number(dateOriginal[2]) == Number(dateRef[2])) {
        setStudent(student)
      } else {
        setError({ type: 'danger', text: "Date of Birth is incorrect. Please try again" })
        setTimeout(() => setError(null), 5000)
      }
    } else {
      setError({ type: 'danger', text: "Student not found" })
      setTimeout(() => setError(null), 5000)
    }
  }
  function showError() {
    if (error) {
      return (
        <div className={`alert alert-dismissible alert-${error.type} mt-3`}>
          <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
          <strong>{error.text}</strong>
        </div>
      )
    }
  }
  return (
    <div className="container">
      <nav className="navbar navbar-expand-lg" >
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">
            <img src={logoIcon} width="30" height="30" className="d-inline-block align-top" alt=""></img>
            DR School - Student Info
          </Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <Link className="nav-link active" aria-current="page" to="/">Login</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link active" aria-current="page" to="http://www.drmschool.ac.in" target="_blank">Main School Website</Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <form>
        <FloatingLabel controlId="floatingSelect" label="Class" className="mb-3">
          <Form.Select name="classGrade" aria-label="Select Class" ref={classGradeRef} onChange={(e) => { setClassGrade(e.target.value) }}>
            {data && data.length > 0 ? (classGrade == 0 ? <option>Select Class</option> : null) : <option>Loading Data...</option>}
            {data && data.length > 0 ? (classGrades.map((grade) => <option key={grade} value={grade}>{grade}</option>)) : null}
          </Form.Select>
        </FloatingLabel>
        {classGrade ?
          <FloatingLabel controlId="floatingSelect" label="Name & Roll Number" className="mb-3">
            <Form.Select aria-label="Select Student" ref={rollNumberRef} onChange={(e) => { setRollNumber(e.target.value); setStudent(null); }}>
              {data && data.filter((student) => student.classGrade == classGrade).map((student) => <option key={student.rollNumber} value={student.rollNumber}>{student.name} & {student.rollNumber}</option>)}
            </Form.Select>
          </FloatingLabel> : null}
        {rollNumber && <Form.Group className="mb-3" controlId="dob">
          <Form.Label>Enter Date of Birth</Form.Label>
          <Form.Control type="date" ref={dobRef} placeholder="DD/MM/YYYY" />
        </Form.Group>}
        <div className="d-flex flex-column mb-3">
          {rollNumber && <Button variant="primary" type="input" onClick={(e) => handleSubmit(e)}>Get Details</Button>}
        </div>
      </form>
      {student && <InfoDisplay />}
      {showError()}
    </div>
  );
};

function SyncMongo({ client }) {
  let [newData, setNewData] = useState([])
  function updateData() {
    client.db('school').collection('rough').find().then((res) => { setNewData(res) }).catch((e) => { console.log(e) })
  }
  function updateFieldsInOldData() {
    newData.forEach((student) => {
      client.db('school').collection('students').updateOne(
        { rollNumber: student.rollNumber },
        { $set: { dob: student.dob } }
      ).then(console.log(`set ${student.rollNumber} $'s dob to ${student.dob}`)).catch((e) => { console.log(e) })
    })
  }
  useEffect(() => updateFieldsInOldData(), [newData])
  return (
    <>
      <h1>Sync Mongo</h1>
      <button onClick={() => updateData()}>Update Data</button>
    </>
  )
}

//function to let teachers enter students marks
function MarksEntry() {
  let { data, updateData, user, client } = useContext(OurContext)
  let [subjects, setSubjects] = useState([])
  let [subject, setSubject] = useState(0)
  let [classGrade, setClassGrade] = useState(0)
  const [maxMarks, setMaxMarks] = useState(0);
  const [oldMaxMarks, setOldMaxMarks] = useState(0);
  const [marks, setMarks] = useState(0);
  const [oldMarks, setOldMarks] = useState(0);
  let classGradeRef = useRef()
  let subjectRef = useRef()
  let classGrades = ['Nursery', 'KG', 1, 2, 3, 4, 5, 6, 7, 8, 9]
  const [saveButtonPosition, setSaveButtonPosition] = useState("static");
  const tableRef = useRef(null);

  useEffect(() => {
    function handleScroll() {
      if (tableRef.current) {
        const tableBottom = tableRef.current.getBoundingClientRect().bottom;
        const viewportBottom = window.innerHeight;
        if (tableBottom > viewportBottom) {
          setSaveButtonPosition("fixed");
        } else {
          setSaveButtonPosition("static");
        }
      }
    }
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (subject != 0) {
      client.db('school').collection('marks').updateOne(
        { classGrade: classGrade, subject: subject },
        { $set: { maxMarks: maxMarks, marks: marks } },
        { upsert: true }
      ).then(console.log(`set ${subject} $'s maxMarks to ${maxMarks} and marks to ${marks}`)).then(()=>{setOldMarks(marks);setOldMaxMarks(maxMarks)}).catch((e) => { console.log(e) })
    }
  };
  //when classGrade changes set subjects
  useEffect(() => {
    if (classGrade != 0) {
      if (classGrade == 'Nursery' || classGrade == 'KG' || classGrade == 1)
        setSubjects(['English Oral', 'English Theory', 'Maths Oral', 'Maths Theory', 'Hindi Oral', 'Hindi Theory'])
      else if (classGrade == 2 || classGrade == 3)
        setSubjects(['Maths', 'English', 'Hindi', 'EVS', 'GK'])
      else if (classGrade == 4 || classGrade == 5)
        setSubjects(['Maths', 'English', 'Hindi', 'EVS', 'Punjabi', 'GK'])
      else if (classGrade == 6 || classGrade == 7 || classGrade == 8 || classGrade == 9)
        setSubjects(['Maths', 'English', 'Hindi', 'Punjabi', 'Science', 'Social Science'])
      else setSubjects(0)
    }
  }, [classGrade])
  //when subjects are set set subject to first subject
  useEffect(() => {
    if (subjects.length > 0) {
      setSubject(subjects[0])
    }
  }, [subjects])

  //when either subject or classGrade changes get maxMarks and marks from db
  useEffect(() => {
    if (subject != 0) {
      client.db('school').collection('marks').find({ classGrade, subject }).then((res) => {
        if (res.length > 0) {
          setMaxMarks(res[0].maxMarks)
          setMarks(res[0].marks)
          setOldMaxMarks(res[0].maxMarks)
          setOldMarks(res[0].marks)
        }
        else {
          setMaxMarks(0)
          setMarks(100)
          setOldMaxMarks(0)
          setOldMarks(100)
        }
      }).catch((e) => { console.log(e) })
    }
  }, [subject, classGrade])

  if (user && user.isLoggedIn)
    return (
      <Container>
        <Navbar />
        <h1>Marks Entry</h1>
        <Row>
          <Form onSubmit={handleSubmit}>
            <FloatingLabel controlId="floatingSelect" label="Class" className="mb-3">
              <Form.Select name="classGrade" aria-label="Select Class" ref={classGradeRef} onChange={(e) => { setClassGrade(e.target.value) }}>
                {data && data.length > 0 ? (classGrade == 0 ? <option>Select Class</option> : null) : <option>Loading Data...</option>}
                {data && data.length > 0 ? (classGrades.map((grade) => <option key={grade} value={grade}>{grade}</option>)) : null}
              </Form.Select>
            </FloatingLabel>
            {classGrade != 0 && subjects != 0 ?
              <FloatingLabel controlId="floatingSelect" label="Select Subject" className="mb-3">
                <Form.Select aria-label="Select Subject" ref={subjectRef} onChange={(e) => setSubject(e.target.value)}>
                  {subjects.map((subject) =>
                    <option key={subject} value={subject}>{subject}</option>)}
                </Form.Select>
              </FloatingLabel> : null}
            {/* Enter marks for each student */}
            {subject != 0 && data &&
              <>
                <InputGroup className="mb-3">
                  <InputGroup.Text>Maximum Marks</InputGroup.Text>
                  <Form.Control type="number" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} />
                </InputGroup>
                <Table striped bordered hover ref={tableRef} className="mb-5">
                  <thead>
                    <tr>
                      <th>Roll</th>
                      <th>Name</th>
                      <th>Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.filter((student) => student.classGrade == classGrade).sort((a, b) => a.rollNumber - b.rollNumber).map((student) => (
                      <tr key={student.rollNumber}>
                        <td>{student.rollNumber}</td>
                        <td>{student.name}</td>
                        <td>
                          <Form.Group key={student.rollNumber}>
                            <Form.Control
                              type="number" min={0} max={maxMarks}
                              value={marks[student.rollNumber] || ''}
                              onChange={
                                (event) => {
                                  setMarks({
                                    ...marks,
                                    [student.rollNumber]: event.target.value,
                                  });
                                }
                              }
                            />
                          </Form.Group>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              <Button
      variant={marks != oldMarks || maxMarks != oldMaxMarks ? "danger" : "secondary"}
      className="position-fixed bottom-0 end-0 m-3"
      style={{ borderRadius: '20%', width: '60px', height: '60px' }}
      type="submit"
    > Upload
      <BsSave size={30} />
    </Button>
                </>}
          </Form>
        </Row>

      </Container>
    )
  else return <Navigate to="/" />
}

export default App;
