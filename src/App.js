import { useEffect, useState, useRef, createContext, useContext,useMemo } from "react";
import * as Realm from "realm-web";
import { useRoutes, Link, useNavigate, useLocation, redirect } from "react-router-dom";
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
  const [students, setStudents] = useState([])
  let navigate = useNavigate()
  let location=useLocation()
  function setNewStudentsData(){
    user && user.type=='admin' && client.db('students-data').collection('students-info').find().then((res) => {setStudents(res)}) 
  }
  function redirect(){
    if(location.pathname=='/' && user && user.state=='LoggedIn'){
      navigate('/checkData')
    }
    if(location.pathname=='/checkData' && (!user || user.state!='LoggedIn')){
      navigate('/')
    }

  }

  useEffect(() => {
    if (!client && user) {
      setClient(app.currentUser.mongoClient("mongodb-atlas"))
    }
    if(client){
      client.db('students-data').collection('students-info').find().then((res) => {setData(res)})
    }
  }, [user, client])

  return (
    <OurContext.Provider value={{
      client,
      setClient,
      user,
      setUser,
      app,
      setApp,
      data,
      setData,
      redirect
    }}>
      <div className="container">
        <Navbar />
        {useRoutes([
          { path: '/', element: <Authenticate /> },
          { path: '/checkData', element: <CheckDataByAdmin /> },
          { path: '/confirmUser', element: <Authenticate/>},
          { path: '/*', element: <Authenticate /> },
        ])}
      </div>
    </OurContext.Provider>
  );
}
function Authenticate() {
  let {setUser, app, redirect } = useContext(OurContext)
  let [type, setType] = useState('login')
  redirect()
  let [error, setError] = useState('')
  let query=useQuery()
  let token=query.get('token')
  let tokenId=query.get('tokenId')
  if(token && tokenId){
    let user = app.emailPasswordAuth.confirmUser({token, tokenId}).then(() => {
      setError("confirmed")
    })
  }
  let handleSubmit = async (e) => {
    e.preventDefault()
    let email = e.target.email.value
    let password = e.target.password.value
    let confirmPassword = e.target.confirmPassword ? e.target.confirmPassword.value : null
    if (type == 'login') {
      try {
        let user = await app.logIn(Realm.Credentials.emailPassword(email, password))
        console.log("user: ", user)
        user && setUser(user)
        redirect()
      } catch (e) {
        setTimeout(() => {
          setError('')
        }, 3000)
        setError(e.error)
      }
    }
    if (type == 'register') {
      if (password != confirmPassword) return setError('Passwords do not match')
      try {
        setError('Loading...')
        let user = await app.emailPasswordAuth.registerUser({ email, password, userId:"avi" })
        redirect()
        setError("Please confirm your email to login")
      } catch (e) {
        setTimeout(() => {
          setError('')
        }, 3000)
        setError(e.error)
      }
    }
    if (type == 'forgotPassword') {
      try {
        await app.emailPasswordAuth.sendResetPasswordEmail(email)
        alert('Password reset link sent to your email')
      } catch (e) {
        setTimeout(() => {
          setError('')
        }, 3000)
        setError(e.error)
      }
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
                <input type="email" className="form-control" name="email" />
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
              {error && error!='confirmed'? <div className="alert alert-danger">{error}</div> : null}
              {error=='confirmed'? <div className="alert alert-success">Email Confimed! Please sign in to continue</div> : null}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckDataByAdmin() {
  let { data, user,redirect } = useContext(OurContext)
  const classGradeRef = useRef(0);
  const nameRef = useRef("");
  redirect()
  const rollNumberRef = useRef('');
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
            {data && data.length > 0 ? (classGrade == 0 ? <option>Select Class</option> : null) : <option>Loading Data...</option>}
            {data && data.length > 0 ? (classGrades.map((grade) => <option key={grade} value={grade}>{grade}</option>)) : null}
          </select>
        </div>
        {classGrade && classGrade > 0 ? <div className="form-group mb-3">
          <label htmlFor="name">Name</label>
          <select className="form-select" aria-label="Select Student" name="name" ref={nameRef} onChange={(e) => setName(e.target.value)}>
            {data && data.filter((student) => student.classGrade == classGrade).map((student) => <option key={student.rollNumber} value={student.name}>{student.name}</option>)}
          </select>
        </div> : null}
        {name && name.length > 0 ? <div className="form-group mb-3">
          <label htmlFor="rollNumberAndGuardian">Roll Number and Guardian Name</label>
          <select className="form-select" aria-label="Select Roll Number & Guardian Name" ref={rollNumberRef} name="rollNumberAndGuardian" onChange={e => setRollNumber(e.target.value)}>
            {data && filterData().map((student) => <option key={student.rollNumber} value={student.rollNumber}>{student.rollNumber} & {student.fatherName}</option>)}
          </select>
        </div> : null}
      </form>
      {rollNumber && rollNumber != 0 ? <StudentInfoDisplay student={data.find((student) => student.rollNumber == rollNumber)} /> : null}
    </>
  );
}

function StudentInfoDisplay(props) {
  let { user, setData, data } = useContext(OurContext)
  let student = props.student
  let [moreDetails, setMoreDetails] = useState(false)
  let [depositingFees, setDepositingFees] = useState(false)
  let [updatingPhoneNumber, setUpdatingPhoneNumber] = useState(false)
  let [contactNumber, setContactNumber] = useState('')
  let contactNumberRef = useRef('')
  let amountToDepositRef = useRef(0)
  let feesDepositCancelRef = useRef('')
  useEffect(() => { setUpdatingPhoneNumber(false); setContactNumber('') }, [student.contactNumbers])
  useEffect(() => { setUpdatingPhoneNumber(false); setDepositingFees(false) }, [student.rollNumber])
  useEffect(() => { if (depositingFees) feesDepositCancelRef.current.scrollIntoView() }, [depositingFees])
  function depositFees() {
    if (amountToDepositRef.current.value == 0) return alert('Please enter an amount to deposit')
    let confirmDeposit = window.confirm(`Confirm deposit Rs.${amountToDepositRef.current.value} for ${student.name} (${student.rollNumber})`)
    async function deposit() {
      let deposited = await user.functions.firstCheck('depositFees', { rollNumber: student.rollNumber, amountToDeposit: Number(amountToDepositRef.current.value), dateOfDeposit: getDate() })
      setDepositingFees(false)
      setUpdatingPhoneNumber(false)
      alert('Fees deposited successfully')
      user.functions.firstCheck('getStudentsInfo').then((data) => setData(data))
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
    function getTransactionTotal() {
      let transactions = []
      if (student.deposits) {
        for (let i = 0; i < student.deposits.length; i++) {
          transactions.push(student.deposits[i][0])
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
            {student.deposits.map((deposit, key) => <tr key={key}><td>{deposit[1]}</td><td>{deposit[0]}</td></tr>)}
            {student.deposits.length > 1 ? <tr className="table-dark"><td>Total Deposits</td><td>{getTransactionTotal()}</td></tr> : null}
          </tbody>
        </table>
      </>
    )
  }
  function updatePhoneNumber() {
    if (contactNumber == '') return alert('Please enter a phone number')
    let confirmUpdate = window.confirm(`Confirm phone number ${contactNumber} for ${student.name} (${student.rollNumber})`)
    async function update() {
      await user.functions.firstCheck('updatePhoneNumber', { rollNumber: student.rollNumber, contactNumber })
      setUpdatingPhoneNumber(false)
      setContactNumber('')
      alert('Phone number updated successfully')
      user.functions.firstCheck('getStudentsInfo').then((data) => setData(data))
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
          (<div className="card-text">Phone <input type="number" className="form-control" autoFocus ref={contactNumberRef} onChange={(e) => setContactNumber(e.target.value)} placeholder='New Phone Number' onKeyDown={(e) => { if (e.key === 'Enter') updatePhoneNumber() }}></input><div className=" container text-center mt-2"><div className="row"><button type="button" className="btn btn-success mb-1" onClick={() => updatePhoneNumber()}>Save</button><button type="button" className="btn btn-danger mb-3" onClick={() => { setUpdatingPhoneNumber(false); setContactNumber(''); }}>Cancel</button></div></div></div>)
          : (<p className="card-text">Phone: {student.contactNumbers ? <a style={{ textDecoration: 'none' }} href={`tel:${student.contactNumbers}`}>&#128222;{student.contactNumbers}</a> : null}<button type="button" className="btn btn-warning ms-3" onClick={() => setUpdatingPhoneNumber(true)}>Update</button> </p>)}
        <p className="card-text">Fees Pending: {Number(student.feesPending2122 ? student.feesPending2122 : 0 + student.feesPending2223 ? student.feesPending2223 : 0) - (student.deposits ? getDepositTotal() : 0)}</p>
        {moreDetails ? (<>
          <p className="card-text">Mother Name: {student.motherName}</p>
          <p className="card-text">Aadhaar Number: {student.aadhaarNumber}</p>
          <p className="card-text">SRN: {student.srn}</p>
          {student.deposits ? getTransactionHistory() : null}
        </>
        ) : null}
        <div className="row"><button className="btn btn-primary mb-2 mt-n3 " onClick={() => setMoreDetails(!moreDetails)}>{moreDetails ? 'Show Less Details ↑' : 'Show More Details ↓'}</button></div>
        {depositingFees ? (
          <>
            <div className="input-group mb-3">
              <div className="input-group-prepend">
                <span className="input-group-text">Rs.</span>
              </div>
              <input type="number" autoFocus className="form-control" ref={amountToDepositRef} onFocus={() => { if (feesDepositCancelRef.current) feesDepositCancelRef.current.scrollIntoView() }} onKeyDown={(e) => { if (e.key === 'Enter') depositFees() }} placeholder='Amount'></input>
            </div>

            <div className="row"><button className="btn btn-success mb-1" onClick={() => depositFees()}>Deposit</button> <button className="btn btn-danger" onClick={() => { setDepositingFees(false) }}>Cancel</button></div><p ref={feesDepositCancelRef}></p>
          </>
        ) : <div className="row"><button className="btn btn-success" onClick={() => setDepositingFees(true)}>New Fees Deposit</button></div>}
      </div>
    </div>
  )
}

function Navbar() {
  let { user,app,setUser } = useContext(OurContext)
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
          {user ? <button className="btn btn-outline-danger" onClick={() => {app.currentUser.logOut();setUser(null)}}>Logout</button> : <Link className="btn btn-outline-success" to="/" >Login</Link>}
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
