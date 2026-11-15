import { useEffect, useState } from "react";
import { Badge, Modal, List, Button } from "antd";
import { FiBell } from "react-icons/fi";
import AxiosConfig from "../../Context/AxiosConfig";

interface NotificationItem {
  id: string;
  NotificationsID?: string;
  Notifications_Title: string;
  Notifications_Body: string;
  Date_Timestamp?: string;
  isRead: boolean;
}

function Notification() {
  const [visible, setVisible] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await AxiosConfig.get("/Notification/getalerts", {
        withCredentials: true,
      });
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const openModal = () => {
    fetchNotifications();
    setVisible(true);
  };

  const handleView = async (id?: string): Promise<void> => {
    if (!id) return;
    try {
      await AxiosConfig.post(`/Notification/markAsRead?NotificationsID=${id}`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label={`Notifications (${unreadCount} unread)`}
        className="relative w-9 h-9 rounded-full bg-slate-50 border border-slate-200/90 hover:border-[#3393B8] hover:bg-white text-slate-600 hover:text-[#22577A] flex items-center justify-center transition-colors cursor-pointer shrink-0"
      >
        <Badge
          count={unreadCount}
          overflowCount={99}
          size="small"
          color="#E60000"
          offset={[2, -2]}
        >
          <FiBell className="text-[16px] text-slate-600" />
        </Badge>
      </button>

      <Modal
        title={
          <div className="flex items-center justify-between pr-6">
            <span className="text-base font-bold text-slate-900">Notifications</span>
            <span className="text-xs font-medium text-slate-500 tabular-nums">
              {unreadCount} unread
            </span>
          </div>
        }
        open={visible}
        onCancel={() => setVisible(false)}
        footer={null}
      >
        <List
          loading={loading}
          dataSource={notifications}
          locale={{ emptyText: "No alerts yet." }}
          renderItem={(item) => {
            const targetId = item.NotificationsID || item.id;
            return (
              <List.Item
                actions={[
                  <Button
                    key="view"
                    type="link"
                    onClick={() => handleView(targetId)}
                    disabled={item.isRead}
                    style={{
                      color: item.isRead ? "#94A3B8" : "#22577A",
                      fontWeight: 600,
                    }}
                  >
                    {item.isRead ? "Viewed" : "Read"}
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <span className="text-sm font-semibold text-slate-900">
                      {item.Notifications_Title}
                    </span>
                  }
                  description={
                    <div className="space-y-1">
                      <div className="text-xs text-slate-600">{item.Notifications_Body}</div>
                      {item.Date_Timestamp && (
                        <div className="text-[11px] text-slate-400 tabular-nums">
                          {new Date(item.Date_Timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Modal>
    </>
  );
}

export default Notification;
