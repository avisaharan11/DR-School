import { useEffect, useState, useRef, createContext, useContext, useMemo } from "react";
import * as Realm from "realm-web";
import 'react-datepicker/dist/react-datepicker.css';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Form from 'react-bootstrap/Form';
import { useRoutes, Link, Navigate, useLocation } from "react-router-dom";
import logoIcon from './/images/logoIcon.ico'

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

  return (
    <OurContext.Provider value={{
      client,
      user,
      setUser,
      app,
      data,
      updateData
    }}>
      <div className="container">
        <Navbar />
        {user && user.isLoggedIn ? <CheckDataByAdmin /> : <Authenticate />}
      </div>
    </OurContext.Provider>
  );
}

function Authenticate() {
  let { setUser, app } = useContext(OurContext)
  let [type, setType] = useState('login')
  let [error, setError] = useState('')
  let thisEmail = useRef()
  let query = useQuery()
  useEffect(() => { confirmUser() }, [])
  function confirmUser() {
    let token = query.get('token')
    let tokenId = query.get('tokenId')
    if (token && tokenId) {
      app.emailPasswordAuth.confirmUser({ token, tokenId }).then((user) => {
        setError({ text: "Email Confimed! Please sign in to continue", type: "success" })
        console.log('Confimed user', user);
      }).catch((e) => { setError({ text: e.error, type: "danger" }) })
    }
  }
  function resendConfirmationEmail(email) {
    setError({ text: 'Sending Email...', type: "info" })
    app.emailPasswordAuth.resendConfirmationEmail({ email }).then((user) => { setError({ text: 'Email sent! Please check your inbox', type: "success" }) }).catch((e) => { setError({ text: e.error, type: "danger" }) })
  }
  let handleSubmit = async (e) => {
    e.preventDefault()
    let email = e.target.email.value
    let password = e.target.password.value
    let confirmPassword = e.target.confirmPassword ? e.target.confirmPassword.value : null
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
      app.emailPasswordAuth.registerUser({ email, password }).then(() => { setError({ text: 'Email sent! Please confirm your email to continue', type: "success" }) }).catch((e) => {
        if (e.error == 'name already in use') {
          setError({ text: 'Email already in use, please login', type: "danger" })
        }
      })
    }
    if (type == 'forgotPassword') {
      app.emailPasswordAuth.sendResetPasswordEmail(thisEmail.current.value).then(() => { setError({ text: 'Email sent! Please check your email to continue', type: "success" }) }).catch((e) => { setError({ text: e.error, type: "danger" }) })
    }
  }
  function showError() {
    if (error) {
      return (
        <div className={`alert alert-dismissible alert-${error.type}`}>
          <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
          <strong>{error.text}</strong>
          {error.text == 'confirmation required' ? <a className="btn btn-link" onClick={() => { resendConfirmationEmail(thisEmail.current.value) }}>Resend Confirmation Email</a> : null}
        </div>
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
              <div className="form-group mb-3">
                <label htmlFor="email">Email</label>
                <input type="email" className="form-control" name="email" ref={thisEmail} />
              </div>
              <div className="form-group mb-3">
                <label htmlFor="password">Password</label>
                <input type="password" className="form-control" name="password" />
              </div>
              {type == 'register' ? <div className="form-group mb-3">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input type="password" className="form-control" name="confirmPassword" />
              </div> : null}
              <div className="form-group mb-3">
                <button type="submit" className="btn btn-primary">{type == 'login' ? 'Login' : type == 'register' ? 'Register' : 'Reset Password'}</button>
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
          <Form.Select name="classGrade" aria-label="Select Class" ref={classGradeRef} onChange={(e) => {setClassGrade(e.target.value)}}>
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
  let {updateData,client } = useContext(OurContext)
  let [moreDetails, setMoreDetails] = useState(false)
  let [depositingFees, setDepositingFees] = useState(false)
  let collection = client.db('school').collection('students')
  let amountToDepositRef = useRef(0)
  let dateOfDepositRef = useRef('')
  let feesDepositCancelRef = useRef('')
  let updateCancelRef = useRef('')
  let [newContactNumber, setNewContactNumber] = useState([])
  let [updatingContactNumber, setUpdatingContactNumber] = useState()
  let [settingNewContactNumber, setSettingNewContactNumber] = useState()

  useEffect(() => { setDepositingFees(false); setUpdatingContactNumber(false) }, [student.rollNumber])
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
    function formatDate(input) {
      let datePart = input.match(/\d+/g)
      let year = datePart[0]
      let month = datePart[1]
      let day = datePart[2]

      return day + '/' + month + '/' + year;
    }
    if (amountToDepositRef.current.value == 0) {
      alert('Please enter an amount to deposit')
      amountToDepositRef.current.focus()
      return
    }
    if (dateOfDepositRef.current.value == '') {
      alert('Please enter a date of deposit')
      dateOfDepositRef.current.focus()
      return
    }
    let date = formatDate(dateOfDepositRef.current.value)
    let confirmDeposit = window.confirm(`Confirm deposit Rs.${amountToDepositRef.current.value} on ${date} for ${student.name} (${student.rollNumber})`)
    async function deposit() {
      collection.updateOne(
        { rollNumber: student.rollNumber },
        { $push: { deposits: { amount: Number(amountToDepositRef.current.value), date } } }
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
      collection.updateOne(
        { rollNumber: student.rollNumber },
        { $push: { contactNumbers: newContactNumber } }
      ).then(() => { updateData() }).catch((err) => alert(err))
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
      collection.updateOne(
        { rollNumber: student.rollNumber },
        { $set: { contactNumbers: student.contactNumbers.map((contactNumber) => contactNumber == oldContactNumber ? newContactNumber : contactNumber) } }
      ).then(() => { updateData() }).catch((err) => alert(err))
    }

    //if no contact number is present, show button to add contact number, which when clicked will show an input box below the contacts currently present and add button to call addContactNumber function with the new contact number that is in the input field as argument
    function addContactNumberInput() {
      return (
        <>
          <div className="input-group mb-3">
            <div className="input-group-prepend">
              <span className="input-group-text">+91 </span>
            </div>
            <input type="number" autoFocus className="form-control" placeholder="Contact Number" onChange={(e) => setNewContactNumber(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addContactNumber(newContactNumber) }}/>
            <div className="input-group-append">
              <button className="btn btn-success" onClick={() => addContactNumber(newContactNumber)}>Add</button>
              <button className="btn btn-danger" onClick={() => setSettingNewContactNumber(false)}>Cancel</button>
            </div>
          </div>
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
                    <button className="btn btn-outline-info btn-sm"><a style={{ textDecoration: "none" }} href={`tel:${contactNumber}`} className="card-link">📞{contactNumber}</a></button>
                    <button className="btn btn-outline-warning mx-1 btn-sm" onClick={() => { setUpdatingContactNumber(contactNumber) }}>Edit</button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => removeContactNumber(contactNumber)}>Delete</button>
                  </div></> : (<>
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
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">{student.name}</h5>
        <h6 className="card-subtitle mb-2 text-muted">{student.rollNumber}</h6>
        <p className="card-text">Guardian Name: {student.fatherName}</p>
        <div className="card-text">Contact Numbers: {contactNumbersSpace()} </div>
        <p className="card-text">Fees Pending: {Number(student.feesPending2122 ? student.feesPending2122 : 0 + student.feesPending2223 ? student.feesPending2223 : 0) - (student.deposits ? getDepositTotal() : 0)}</p>
        {moreDetails ? (
          <>
            <p className="card-text">Mother Name: {student.motherName}</p>
            <p className="card-text">Aadhaar Number: {student.aadhaarNumber}</p>
            <p className="card-text">SRN: {student.srn}</p>
            {student.deposits ? getTransactionHistory() : null}
          </>
        ) : null}
        <div className="row">
          <button className="btn btn-primary mb-2 mt-n3 " onClick={() => setMoreDetails(!moreDetails)}>{moreDetails ? 'Show Less Details ↑' : 'Show More Details ↓'}</button>
          </div>
        {depositingFees ? (
          <>
            <div className="input-group mb-3">
              <div className="input-group-prepend">
                <span className="input-group-text">Rs.</span>
              </div>
              <input type="number" autoFocus className="form-control" ref={amountToDepositRef} onFocus={() => { if (feesDepositCancelRef.current) feesDepositCancelRef.current.scrollIntoView() }} onKeyDown={(e) => { if (e.key === 'Enter') depositFees() }} placeholder='Amount'></input>
              <input type="date" ref={dateOfDepositRef} onKeyDown={(e) => { if (e.key === 'Enter') depositFees() }} placeholder='Deposit Date'></input>
            </div>
            <div className="row">
              <button className="btn btn-success mb-1" onClick={() => depositFees()}>Deposit</button>
              <button className="btn btn-danger mb-1" onClick={() => { setDepositingFees(false) }}>Cancel</button>
            </div>
            <p ref={feesDepositCancelRef}></p>
          </>
        ) : <div className="row"><button className="btn btn-success" onClick={() => setDepositingFees(true)}>New Fees Deposit</button>   </div>}
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
          DR School - Info
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link active" aria-current="page" to="/">Home</Link>
            </li>
          </ul>
        </div>
        <div className="d-flex">
          {user ? <button className="btn btn-outline-danger" onClick={() => { app.currentUser.logOut(); setUser(null) }}>Logout</button> : <Link className="btn btn-outline-success" to="/" >Login</Link>}
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
    <button className="scrollTop btn btn-outline-success btn-lg" type="button" onClick={scrollTop} style={{ display: showScroll ? 'block' : 'none', position: 'fixed', bottom: '20px', right: '20px', }}>↑</button>
  );
}

export default App;
