import { BrowserRouter, Route, Routes } from "react-router-dom"
import Account from "./Account"
import Board from "./Board"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" Component={Account} />
        <Route path="/board" Component={Board} />
      </Routes>
    </BrowserRouter>
  )
}

