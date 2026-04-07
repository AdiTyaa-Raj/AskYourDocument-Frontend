interface SuggestedQuestionsProps {
  questions: readonly string[]
  onQuestionClick: (question: string) => void
}

export function SuggestedQuestions({ questions, onQuestionClick }: SuggestedQuestionsProps) {
  return (
    <>
      <p className="text-sm text-gray-600 dark:text-gray-400">Suggested questions:</p>
      {questions.map((suggestedQuestion, index) => (
        <button
          key={index}
          onClick={() => onQuestionClick(suggestedQuestion)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm text-gray-700 transition-all duration-200 hover:border-gray-300 hover:bg-gray-100 hover:shadow-sm dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-600"
        >
          {suggestedQuestion}
        </button>
      ))}
    </>
  )
}
