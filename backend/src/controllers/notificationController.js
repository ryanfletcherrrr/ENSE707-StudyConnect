import {
    getNotificationsByStudent,
    getNotificationById,
    markNotificationAsRead,
  } from '../models/notificationModel.js';
  
  export function getNotifications(req, res) {
    const notifications = getNotificationsByStudent(req.studentId);
  
    return res.status(200).json({ notifications });
  }
  
  export function getNotification(req, res) {
    const notificationId = Number(req.params.id);
  
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({ error: 'Invalid notification ID.' });
    }
  
    const notification = getNotificationById(
      req.studentId,
      notificationId
    );
  
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
  
    return res.status(200).json({ notification });
  }
  
  export function markAsRead(req, res) {
    const notificationId = Number(req.params.id);
  
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({ error: 'Invalid notification ID.' });
    }
  
    const notification = getNotificationById(
      req.studentId,
      notificationId
    );
  
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
  
    markNotificationAsRead(req.studentId, notificationId);
  
    const updatedNotification = getNotificationById(
      req.studentId,
      notificationId
    );
  
    return res.status(200).json({
      message: 'Notification marked as read.',
      notification: updatedNotification,
    });
  }