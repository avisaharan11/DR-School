return (
    <div className="print-layout">
      <h1>ABC School</h1>
      <img src="/path/to/school-logo.png" alt="School Logo" className="school-logo" />
      <h2>Student Information</h2>

      <div className="group">
        <h3>Personal Information</h3>
        <ul>
          <li><strong>Name:</strong> {name}</li>
          <li><strong>Class:</strong> {classGrade}</li>
          <li><strong>Roll Number:</strong> {rollNumber}</li>
          <li><strong>Father's Name:</strong> {fatherName}</li>
          <li><strong>Mother's Name:</strong> {motherName}</li>
          <li>
            <strong>Contact Numbers:</strong>
            <ul>
              {contactNumbers.map((number, index) => (
                <li key={index}>{number}</li>
              ))}
              </ul>
      </li>
    </ul>
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
        {studentResults.map((result, index) => (
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
        {feesDeposits.map((deposit, index) => (
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
    <p>{classInChargeRemarks}</p>
  </div>
</div>


