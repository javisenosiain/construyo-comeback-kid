import { useParams } from "react-router-dom";
import CustomerFeedbackForm from "@/components/CustomerFeedbackForm";

/**
 * Public Feedback Form Page
 * 
 * Handles token-based access to customer feedback forms.
 * URL format: /feedback/:token
 */
export default function FeedbackFormPage() {
  const { token } = useParams<{ token: string }>();

  if (!token) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Link</h1>
          <p className="text-muted-foreground">
            This feedback form link is invalid or incomplete.
          </p>
        </div>
      </div>
    );
  }

  return <CustomerFeedbackForm token={token} />;
}