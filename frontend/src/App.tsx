import { Route, Routes } from "react-router-dom"

import { Layout } from "@/components/layout/Layout"
import HomePage from "@/pages/HomePage"

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
      </Route>
    </Routes>
  )
}

export default App
