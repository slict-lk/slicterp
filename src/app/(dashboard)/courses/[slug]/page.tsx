'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, Users, PlayCircle, CheckCircle, Lock } from 'lucide-react';
import Link from 'next/link';

export default function CoursePlayerPage() {
  const params = useParams();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);

  useEffect(() => {
    fetchCourse();
  }, [params.slug]);

  const fetchCourse = async () => {
    try {
      const tenantId = 'tenant-1';
      const response = await fetch(`/api/courses?tenantId=${tenantId}`);
      const courses = await response.json();
      const found = courses.find((c: any) => c.slug === params.slug);
      
      if (found) {
        const detailResponse = await fetch(`/api/courses/${found.id}`);
        const detail = await response.json();
        setCourse(detail);
        if (detail.lessons?.length > 0) {
          setSelectedLesson(detail.lessons[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch course:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8">
        <Card className="p-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Course not found</h3>
          <Button asChild className="mt-4">
            <Link href="/courses">Back to Courses</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Course Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="bg-white/20 text-white">
              {course.level}
            </Badge>
            {course.isFree && (
              <Badge variant="secondary" className="bg-green-500 text-white">
                FREE
              </Badge>
            )}
          </div>
          <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
          <p className="text-lg opacity-90 mb-6">{course.description}</p>
          
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {course.duration} minutes
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {course._count?.enrollments || 0} students
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {course._count?.lessons || 0} lessons
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {selectedLesson ? (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedLesson.title}</CardTitle>
                  <CardDescription>
                    Lesson {selectedLesson.order} • {selectedLesson.duration} minutes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Video Player Placeholder */}
                  <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center mb-6">
                    <PlayCircle className="h-16 w-16 text-white opacity-75" />
                  </div>

                  {selectedLesson.content && (
                    <div className="prose max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: selectedLesson.content }} />
                    </div>
                  )}

                  {selectedLesson.videoUrl && (
                    <p className="text-sm text-muted-foreground mt-4">
                      Video URL: {selectedLesson.videoUrl}
                    </p>
                  )}

                  <div className="flex gap-2 mt-6">
                    <Button>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Complete
                    </Button>
                    <Button variant="outline">Next Lesson</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No lessons available</h3>
                <p className="text-muted-foreground">This course doesn't have any lessons yet</p>
              </Card>
            )}
          </div>

          {/* Sidebar - Lesson List */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
                <CardDescription>
                  {course._count?.lessons || 0} lessons
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {course.lessons?.map((lesson: any, index: number) => (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedLesson?.id === lesson.id
                        ? 'bg-primary text-white'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 ${
                        selectedLesson?.id === lesson.id ? 'text-white' : 'text-muted-foreground'
                      }`}>
                        {lesson.isFree ? (
                          <PlayCircle className="h-5 w-5" />
                        ) : (
                          <Lock className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{lesson.title}</p>
                        <p className={`text-xs ${
                          selectedLesson?.id === lesson.id ? 'text-white/75' : 'text-muted-foreground'
                        }`}>
                          {lesson.duration} min
                        </p>
                      </div>
                    </div>
                  </button>
                ))}

                {(!course.lessons || course.lessons.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No lessons available
                  </p>
                )}
              </CardContent>
            </Card>

            <Button className="w-full" size="lg">
              Enroll Now
              {!course.isFree && ` - $${course.price}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
