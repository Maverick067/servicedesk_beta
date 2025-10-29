"use client";

import { motion } from "framer-motion";
import { QueueList } from "@/components/queues/queue-list";
import { CreateQueueDialog } from "@/components/queues/create-queue-dialog";
import { useSession } from "next-auth/react";
import { ModuleGuard } from "@/components/module-guard";

export default function QueuesPage() {
  const { data: session } = useSession();
  const canManage = session?.user.role === "TENANT_ADMIN" || session?.user.role === "ADMIN";

  return (
    <ModuleGuard module="queues" moduleName="Queues">
      <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Queues
          </h1>
          <p className="text-muted-foreground mt-2">
            Organize and group tickets
          </p>
        </div>
        {canManage && <CreateQueueDialog />}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <QueueList />
      </motion.div>
    </div>
    </ModuleGuard>
  );
}

