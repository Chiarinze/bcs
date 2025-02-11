import { Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import BoardMemberDetail from "./pages/BoardMemberDetail";
import ScrollToTop from "./components/ScrollToTop";

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/board/:id" element={<BoardMemberDetail />} />
      </Routes>
    </>
  );
}

export default App;
