import { Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import BoardMemberDetail from "./pages/BoardMemberDetail";
import ScrollToTop from "./components/ScrollToTop";
import ExamRegistrationPage from "./pages/ExamRegistrationPage";
import ExamLandingPage from "./pages/ExamLandingPage";

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/board/:id" element={<BoardMemberDetail />} />
        <Route path="/exam" element={<ExamLandingPage />} />
        <Route path="/exam-registration" element={<ExamRegistrationPage />} />
      </Routes>
    </>
  );
}

export default App;
