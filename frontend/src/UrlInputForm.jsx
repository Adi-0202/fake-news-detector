import { useState } from 'react'

function UrlInputForm() {
  const [url, setUrl] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url })
    })
    
    const data = await response.json()
    console.log("Response from Backend:", data)
    alert("Check the browser console for the mock data!")
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input 
        type="text" 
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter article URL..." 
        className="border-2 border-gray-300 p-2 rounded-lg w-80" 
      />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">
        Analyze
      </button>
    </form>
  )
}

export default UrlInputForm