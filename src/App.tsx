import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import BoardMemberDetail from "./pages/BoardMemberDetail";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/board/:id" element={<BoardMemberDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
