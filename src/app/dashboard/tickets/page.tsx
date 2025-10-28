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
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
            Tickets
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Manage requests and issues
          </p>
        </div>
        <Link href="/dashboard/tickets/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation">
            <Plus className="mr-2 h-4 w-4" />
            <span className="sm:inline">Create Ticket</span>
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

