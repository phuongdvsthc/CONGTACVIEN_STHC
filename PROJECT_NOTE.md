# Project Note

- C3.6B: Đã triển khai xong 5 sự kiện thông báo hệ thống.
  - Tình trạng: PARTIAL.
  - Vấn đề: Sự kiện được phát sinh trong transaction riêng biệt (Node.js) sau RPC commit, chưa đạt yêu cầu nguyên tử tuyệt đối trong SQL.
  - Kế hoạch: Sẽ refactor vào các phase tiếp theo hoặc khi có yêu cầu fix atomicity bắt buộc.
