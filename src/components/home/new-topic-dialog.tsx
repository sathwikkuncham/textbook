"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NewTopicForm } from "./new-topic-form";

export function NewTopicDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" />
          New Learning Path
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-serif">
            Start a New Learning Path
          </DialogTitle>
        </DialogHeader>
        <NewTopicForm />
      </DialogContent>
    </Dialog>
  );
}
