import React, { useState } from "react";

const Gate = () => {
  const [scannerActive, setScannerActive] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  // Simulated recognition status
  const [recognitionStatus, setRecognitionStatus] = useState("");
  // Visitor pass form state
  const [visitorName, setVisitorName] = useState("");
  const [visitorMobile, setVisitorMobile] = useState("");
  const [visitorReason, setVisitorReason] = useState("");

  const handleToggleScanner = (on: boolean) => {
    if (on) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setScannerActive(true);
        setStatus("Scanner Active");
        // Simulate recognition after 2s
        setTimeout(() => {
          // Simulate not recognized for demo
          setRecognitionStatus("❌ Face not recognized");
        }, 2000);
      }, 1000);
    } else {
      setScannerActive(false);
      setStatus("Scanner Stopped");
      setRecognitionStatus("");
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 font-poppins flex flex-col">
      {/* Enlarged Logo at top */}
      <img src="/college_logo.png" alt="College Logo" className="w-64 h-auto mx-auto mt-4 mb-2" />
      {/* Main Attendance Box */}
      <div className="bg-white p-8 rounded-2xl shadow-lg w-[90%] mx-auto mt-10 text-center space-y-4 flex flex-col items-center justify-center">
        {/* Toggle ON/OFF Button Group */}
        <div className="flex flex-row gap-6 items-center justify-center">
          <button
            className={`px-6 py-2 font-bold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-green-400 ${scannerActive ? 'bg-green-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white/80'}`}
            onClick={() => handleToggleScanner(true)}
            disabled={scannerActive || loading}
          >
            {loading && !scannerActive ? (
              <span className="flex items-center gap-2"><svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Starting...</span>
            ) : (
              "Start Scanner"
            )}
          </button>
          <button
            className={`px-6 py-2 font-bold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-400 ${!scannerActive ? 'bg-red-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white/80'}`}
            onClick={() => handleToggleScanner(false)}
            disabled={!scannerActive}
          >
            End Scanner
          </button>
        </div>
        {/* Status Text */}
        {status && (
          <div className={`text-lg font-semibold ${scannerActive ? 'text-green-700' : 'text-red-700'} mt-2`}>{status}</div>
        )}
        {/* Webcam Preview and Recognition Status */}
        {scannerActive && (
          <>
            <video
              className="w-[75%] max-w-[800px] mx-auto mt-6 rounded-xl shadow-md object-cover"
              autoPlay
              playsInline
              muted
              // Simulated: in real use, attach webcam stream here
            >
              {/* Webcam stream would be rendered here */}
            </video>
            <p id="recognition-status" className="mt-4 text-center text-xl text-green-600 font-semibold min-h-[2rem]">
              {recognitionStatus}
            </p>
            {/* Visitor Pass Box if not recognized */}
            {recognitionStatus && recognitionStatus.toLowerCase().includes('not recognized') && (
              <div className="bg-white w-[90%] max-w-xl mx-auto mt-6 p-6 rounded-xl shadow-lg space-y-4">
                <h2 className="text-xl font-semibold text-center">VISITORS PASS</h2>
                <form className="space-y-4">
                  <div>
                    <label className="block text-left font-medium mb-1">Name</label>
                    <input
                      type="text"
                      className="w-full border border-blue-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Enter your name"
                      value={visitorName}
                      onChange={e => setVisitorName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-left font-medium mb-1">Mobile Number</label>
                    <input
                      type="number"
                      className="w-full border border-blue-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Enter your mobile number"
                      value={visitorMobile}
                      onChange={e => setVisitorMobile(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-left font-medium mb-1">Reason of Visit</label>
                    <textarea
                      className="w-full border border-blue-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Enter reason for your visit"
                      value={visitorReason}
                      onChange={e => setVisitorReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                  {/* You can add a submit button here if needed */}
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Gate; 