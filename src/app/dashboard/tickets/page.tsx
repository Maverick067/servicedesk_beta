"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TicketList } from "@/components/tickets/ticket-list";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
            Тикеты
          </h1>
          <p className="text-muted-foreground mt-2">
            Управление запросами и заявками
          </p>
        </div>
        <Link href="/dashboard/tickets/new">
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300">
            <Plus className="mr-2 h-4 w-4" />
            Создать тикет
          </Button>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <TicketList />
      </motion.div>
    </div>
  );
}

