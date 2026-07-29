import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserX } from "lucide-react";

export default function UserStatistics() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Total Users
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              0
            </h2>
          </div>

          <Users className="h-10 w-10 text-muted-foreground" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Active Users
            </p>

            <h2 className="mt-2 text-3xl font-bold text-green-600">
              0
            </h2>
          </div>

          <UserCheck className="h-10 w-10 text-green-600" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Inactive Users
            </p>

            <h2 className="mt-2 text-3xl font-bold text-red-600">
              0
            </h2>
          </div>

          <UserX className="h-10 w-10 text-red-600" />
        </CardContent>
      </Card>
    </div>
  );
}