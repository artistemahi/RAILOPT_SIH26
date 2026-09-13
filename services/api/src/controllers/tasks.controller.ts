import type { Request, Response } from "express";
import {
  getTaskById,
  getTasks,
} from "../services/tasks.service.js";

export async function listTasks(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const limit = Number(request.query.limit) || 50;

    const tasks = await getTasks(limit);

    response.json({
      success: true,
      count: tasks.length,
      results: tasks,
    });
  } catch (error) {
    console.error("Failed to fetch tasks:", error);

    response.status(500).json({
      success: false,
      error: "Failed to fetch tasks",
    });
  }
}

export async function getTask(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const taskId :any = request.params.taskId;

    const task = await getTaskById(taskId);

    if (!task) {
      response.status(404).json({
        success: false,
        error: "Task not found",
      });
      return;
    }

    response.json({
      success: true,
      result: task,
    });
  } catch (error) {
    console.error("Failed to fetch task:", error);

    response.status(500).json({
      success: false,
      error: "Failed to fetch task",
    });
  }
}