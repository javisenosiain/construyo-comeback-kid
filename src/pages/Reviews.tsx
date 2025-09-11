import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Send, ExternalLink, MessageSquare, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FeedbackFormManager from "@/components/FeedbackFormManager";
import NegativeFeedbackDiversion from "@/components/NegativeFeedbackDiversion";

const Reviews = () => {
  const reviews = [
    {
      id: 1,
      customer: "Sarah Johnson",
      project: "Kitchen Extension", 
      rating: 5,
      comment: "Absolutely fantastic work! The team was professional, punctual, and the quality exceeded our expectations. Highly recommend!",
      platform: "Google",
      date: "2024-01-10",
      status: "published"
    },
    {
      id: 2,
      customer: "Michael Chen",
      project: "Bathroom Renovation",
      rating: 5,
      comment: "Great attention to detail and finished exactly on time. Very happy with the results and would definitely use again.",
      platform: "Trustpilot",
      date: "2024-01-08",
      status: "published"
    },
    {
      id: 3,
      customer: "Emma Williams",
      project: "Loft Conversion",
      rating: null,
      comment: null,
      platform: null,
      date: "2024-01-15",
      status: "requested"
    }
  ];

  const reviewRequests = [
    {
      customer: "David Thompson",
      project: "Garden Decking",
      sentDate: "2024-01-12",
      reminderCount: 1
    },
    {
      customer: "Lisa Parker",
      project: "Garage Conversion",
      sentDate: "2024-01-14",
      reminderCount: 0
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-success text-success-foreground";
      case "requested": return "bg-accent text-accent-foreground";
      case "pending": return "bg-secondary text-secondary-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? "fill-primary text-primary" : "text-muted-foreground"
        }`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Review Management</h1>
            <p className="text-muted-foreground">Automate review requests and manage your online reputation</p>
          </div>
          <Button>
            <Send className="w-4 h-4 mr-2" />
            Request Review
          </Button>
        </div>

        <Tabs defaultValue="reviews" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="feedback-forms">
              <FileText className="w-4 h-4 mr-2" />
              Feedback Forms
            </TabsTrigger>
            <TabsTrigger value="negative-diversion">Negative Diversion</TabsTrigger>
          </TabsList>

          <TabsContent value="reviews">{/* Review content */}

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-primary">4.8</div>
                <div className="flex">
                  {renderStars(5)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Based on 47 reviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">8</div>
              <p className="text-xs text-muted-foreground">New reviews received</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">72%</div>
              <p className="text-xs text-muted-foreground">Customers who leave reviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Google Ranking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent-foreground">#3</div>
              <p className="text-xs text-muted-foreground">Local search results</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Reviews List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Reviews</CardTitle>
                <CardDescription>
                  Customer reviews across all platforms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{review.customer}</h4>
                        <p className="text-sm text-muted-foreground">{review.project}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(review.status)}>
                          {review.status}
                        </Badge>
                        {review.platform && (
                          <p className="text-xs text-muted-foreground mt-1">{review.platform}</p>
                        )}
                      </div>
                    </div>

                    {review.rating && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {renderStars(review.rating)}
                        </div>
                        <span className="text-sm font-medium">{review.rating}/5</span>
                      </div>
                    )}

                    {review.comment && (
                      <p className="text-sm mb-3">"{review.comment}"</p>
                    )}

                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{new Date(review.date).toLocaleDateString()}</span>
                      {review.status === "published" && (
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View on {review.platform}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pending Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Pending Requests
                </CardTitle>
                <CardDescription>
                  Review requests awaiting response
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviewRequests.map((request, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{request.customer}</p>
                        <p className="text-xs text-muted-foreground">{request.project}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Remind
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Sent: {new Date(request.sentDate).toLocaleDateString()}
                      {request.reminderCount > 0 && (
                        <span> • {request.reminderCount} reminder(s)</span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Platform Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Google Reviews</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">4.9</span>
                    <span className="text-xs text-muted-foreground">(28)</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Trustpilot</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">4.7</span>
                    <span className="text-xs text-muted-foreground">(19)</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Facebook</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">4.8</span>
                    <span className="text-xs text-muted-foreground">(12)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="feedback-forms">
            <FeedbackFormManager />
          </TabsContent>

          <TabsContent value="negative-diversion">
            <NegativeFeedbackDiversion />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reviews;