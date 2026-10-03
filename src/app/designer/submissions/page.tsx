export default function DesignerSubmissions() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          My Submissions
        </h1>
        <p className="text-gray-600">
          Track all your design submissions and feedback
        </p>
      </div>

      {/* Placeholder */}
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="text-6xl mb-4">📤</div>
        <p className="text-gray-600 text-lg mb-4">No submissions yet</p>
        <p className="text-gray-500">
          Your submitted proposals will appear here
        </p>
      </div>
    </div>
  );
}
