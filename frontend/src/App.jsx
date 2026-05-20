import UrlInputForm from './UrlInputForm'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">
        Real-time Fake News Detector
      </h1>
      <UrlInputForm />
    </div>
  )
}

export default App