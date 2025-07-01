import { useState, useEffect } from "react";
import { Plus, Users, Calendar, Settings } from "lucide-react";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import apiClient from "@/api";

const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, "Group name is required")
    .max(100, "Group name too long"),
  description: z.string().max(500, "Description too long").optional(),
});

type CreateGroupData = z.infer<typeof createGroupSchema>;

interface Group {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  members: Array<{
    userId: string;
    role: "ADMIN" | "MEMBER";
    joinedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
    };
  }>;
  _count: {
    expenses: number;
  };
}

export function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<CreateGroupData>({
    resolver: zodResolver(createGroupSchema),
  });

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/groups");

      if (response.data.success) {
        setGroups(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const onCreateGroup = async (data: CreateGroupData) => {
    setIsCreating(true);
    try {
      const response = await apiClient.post("/groups", data);

      if (response.data.success) {
        setGroups([response.data.data, ...groups]);
        setCreateDialogOpen(false);
        reset();
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "Failed to create group";
      setError("root", { message: errorMessage });
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getUserRole = (group: Group) => {
    const member = group.members.find((m) => m.userId === user?.id);
    return member?.role || "MEMBER";
  };

  const getMemberCount = (group: Group) => {
    return group.members.length;
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
            <p className="text-muted-foreground">
              Manage your expense sharing groups
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Create a new group to start sharing expenses with friends,
                  family, or colleagues.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={handleSubmit(onCreateGroup)}
                className="space-y-4"
              >
                {errors.root && (
                  <div className="bg-destructive/15 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
                    {errors.root.message}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Group Name</Label>
                  <Input {...register("name")} placeholder="Enter group name" />
                  {errors.name && (
                    <p className="text-sm text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    {...register("description")}
                    placeholder="Enter group description"
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1"
                  >
                    {isCreating ? "Creating..." : "Create Group"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Groups Grid */}
        {groups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first group to start sharing expenses with friends,
                family, or colleagues.
              </p>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Your First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1">
                        {group.name}
                      </CardTitle>
                      {group.description && (
                        <CardDescription className="line-clamp-2 mt-1">
                          {group.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {getUserRole(group) === "ADMIN" && (
                        <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          Admin
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{getMemberCount(group)} members</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(group.createdAt)}</span>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {group?._count?.expenses
                      ? group?._count?.expenses + " expenses"
                      : null}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        // Navigate to group detail page
                        window.location.href = `/groups/${group.id}`;
                      }}
                    >
                      View Details
                    </Button>
                    {getUserRole(group) === "ADMIN" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Navigate to group settings
                          window.location.href = `/groups/${group.id}/settings`;
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
