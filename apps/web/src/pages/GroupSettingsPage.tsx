import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Trash2, AlertTriangle, Crown } from "lucide-react";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { useAuth } from "../contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import apiClient from "@/api";

const updateGroupSchema = z.object({
  name: z
    .string()
    .min(1, "Group name is required")
    .max(100, "Group name too long"),
  description: z.string().max(500, "Description too long").optional(),
});

type UpdateGroupData = z.infer<typeof updateGroupSchema>;

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
}

export function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<UpdateGroupData>({
    resolver: zodResolver(updateGroupSchema),
  });

  const fetchGroup = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/groups/${groupId}`);

      if (response.data.success) {
        const groupData = response.data.data;
        setGroup(groupData);
        reset({
          name: groupData.name,
          description: groupData.description || "",
        });
      }
    } catch (error: any) {
      console.error("Error fetching group:", error);
      if (error.response?.status === 403) {
        navigate("/groups");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchGroup();
    }
  }, [groupId]);

  const getUserRole = () => {
    if (!group || !user) return "MEMBER";
    const member = group.members.find((m) => m.userId === user.id);
    return member?.role || "MEMBER";
  };

  const isAdmin = () => getUserRole() === "ADMIN";

  const onUpdateGroup = async (data: UpdateGroupData) => {
    setIsUpdating(true);
    try {
      const response = await apiClient.put(`/groups/${groupId}`, data);

      if (response.data.success) {
        setGroup(response.data.data);
        alert("Group updated successfully!");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "Failed to update group";
      setError("root", { message: errorMessage });
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteGroup = async () => {
    setIsDeleting(true);
    try {
      const response = await apiClient.delete(`/groups/${groupId}`);

      if (response.data.success) {
        navigate("/groups");
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to delete group");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const updateMemberRole = async (
    userId: string,
    newRole: "ADMIN" | "MEMBER"
  ) => {
    try {
      const response = await apiClient.put(
        `/groups/${groupId}/members/${userId}/role`,
        { role: newRole }
      );

      if (response.data.success) {
        setGroup(response.data.data);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to update member role");
    }
  };

  const removeMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const response = await apiClient.delete(
        `/groups/${groupId}/members/${userId}`
      );

      if (response.data.success) {
        setGroup(response.data.data);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to remove member");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="space-y-4">
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!group || !isAdmin()) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Access Denied</h2>
            <p className="text-muted-foreground mt-2">
              You don't have permission to access group settings.
            </p>
            <Button
              onClick={() => navigate(`/groups/${groupId}`)}
              className="mt-4"
            >
              Back to Group
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/groups/${groupId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Group Settings
            </h1>
            <p className="text-muted-foreground">{group.name}</p>
          </div>
        </div>

        <div className="space-y-6 max-w-2xl">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update your group's name and description
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit(onUpdateGroup)}
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
                  <Label htmlFor="description">Description</Label>
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

                <Button type="submit" disabled={isUpdating} className="gap-2">
                  <Save className="h-4 w-4" />
                  {isUpdating ? "Updating..." : "Update Group"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Member Management */}
          <Card>
            <CardHeader>
              <CardTitle>Member Management</CardTitle>
              <CardDescription>
                Manage member roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {group.members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {member.user.avatarUrl ? (
                        <img
                          src={member.user.avatarUrl}
                          alt={member.user.name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                          <span className="text-secondary-foreground font-medium">
                            {member.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.user.name}</p>
                          {member.role === "ADMIN" && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {member.user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {member.userId !== user?.id && (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) =>
                              updateMemberRole(
                                member.userId,
                                e.target.value as "ADMIN" | "MEMBER"
                              )
                            }
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeMember(member.userId)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {member.userId === user?.id && (
                        <span className="text-sm text-muted-foreground">
                          You
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that will permanently affect this group
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Delete Group
                    </DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this group? This action
                      cannot be undone. All expenses, settlements, and member
                      data will be permanently lost.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={deleteGroup}
                      disabled={isDeleting}
                      className="flex-1"
                    >
                      {isDeleting ? "Deleting..." : "Delete Group"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
