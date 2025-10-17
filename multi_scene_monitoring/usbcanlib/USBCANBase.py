from ctypes import *
import time
import cv2
from queue import Empty
import numpy as np

VCI_USBCAN2 = 4
STATUS_OK = 1

font_faces = [
    cv2.FONT_HERSHEY_SIMPLEX,
    cv2.FONT_HERSHEY_PLAIN,
    cv2.FONT_HERSHEY_DUPLEX,
    cv2.FONT_HERSHEY_COMPLEX,
    cv2.FONT_HERSHEY_TRIPLEX,
    cv2.FONT_HERSHEY_COMPLEX_SMALL,
    cv2.FONT_HERSHEY_SCRIPT_SIMPLEX,
    cv2.FONT_HERSHEY_SCRIPT_COMPLEX,
    cv2.FONT_ITALIC
  ]


class VCI_INIT_CONFIG(Structure):
    _fields_ = [("AccCode", c_uint),
                ("AccMask", c_uint),
                ("Reserved", c_uint),
                ("Filter", c_ubyte),
                ("Timing0", c_ubyte),
                ("Timing1", c_ubyte),
                ("Mode", c_ubyte)
                ]


class VCI_CAN_OBJ(Structure):
    _fields_ = [("ID", c_uint),
                ("TimeStamp", c_uint),
                ("TimeFlag", c_ubyte),
                ("SendType", c_ubyte),
                ("RemoteFlag", c_ubyte),
                ("ExternFlag", c_ubyte),
                ("DataLen", c_ubyte),
                ("Data", c_ubyte * 8),
                ("Reserved", c_ubyte * 3)
                ]


def int_transform_4hex(intNums):
    if intNums < 0:  # 如果是负数
        str_list_16nums = list(hex(intNums % 65536))
        insert_num = 'f'
    else:  # 如果是正数
        str_list_16nums = list(hex(intNums))
        insert_num = '0'
    # 补位数
    if len(str_list_16nums) == 5:
        str_list_16nums.insert(2, insert_num)
    elif len(str_list_16nums) == 4:
        str_list_16nums.insert(2, insert_num)
        str_list_16nums.insert(2, insert_num)
    elif len(str_list_16nums) == 3:
        str_list_16nums.insert(2, insert_num)
        str_list_16nums.insert(2, insert_num)
        str_list_16nums.insert(2, insert_num)
    else:
        pass
    crc_data = "".join(str_list_16nums)  # 用""把数组的每一位结合起来  组成新的字符串
    print(crc_data)
    hexNums = crc_data[2:4] + ' ' + crc_data[4:]
    return hexNums


class USBCAN():
    def __init__(self, CanDLLName='./usbcanlib/ControlCAN.dll'):
        self.CanDLLName = CanDLLName
        self.canDLL = windll.LoadLibrary(self.CanDLLName)
        self.init_CAN()
        self.relative_zero_0 = 0
        self.relative_zero_1 = 0
        self.curr_relative_0 = 0
        self.curr_relative_1 = 0
        self.target_degree = (0, 0)
        self.switch_go_to_degree = False

    def init_CAN(self):
        # CanDLLName = './usbcanlib/ControlCAN.dll'  # 把DLL放到对应的目录下
        # canDLL = windll.LoadLibrary(CanDLLName)
        # Linux系统下使用下面语句，编译命令：python3 python3.8.0.py
        # canDLL = cdll.LoadLibrary('./libcontrolcan.so')
        print(self.CanDLLName)

        ret = self.canDLL.VCI_OpenDevice(VCI_USBCAN2, 0, 0)
        if ret == STATUS_OK:
            print('调用 VCI_OpenDevice成功\r\n')
        if ret != STATUS_OK:
            print('调用 VCI_OpenDevice出错\r\n')

        vci_initconfig = VCI_INIT_CONFIG(0x80000008, 0xFFFFFFFF, 0, 0, 0x00, 0x14, 0)  # 波特率1000k，正常模式

        # 初始0通道
        ret = self.canDLL.VCI_InitCAN(VCI_USBCAN2, 0, 0, byref(vci_initconfig))
        if ret == STATUS_OK:
            print('调用 VCI_InitCAN1成功\r\n')
        if ret != STATUS_OK:
            print('调用 VCI_InitCAN1出错\r\n')

        ret = self.canDLL.VCI_StartCAN(VCI_USBCAN2, 0, 0)
        if ret == STATUS_OK:
            print('调用 VCI_StartCAN1成功\r\n')
        if ret != STATUS_OK:
            print('调用 VCI_StartCAN1出错\r\n')

        # 初始1通道
        ret = self.canDLL.VCI_InitCAN(VCI_USBCAN2, 0, 1, byref(vci_initconfig))
        if ret == STATUS_OK:
            print('调用 VCI_InitCAN2 成功\r\n')
        if ret != STATUS_OK:
            print('调用 VCI_InitCAN2 出错\r\n')

        ret = self.canDLL.VCI_StartCAN(VCI_USBCAN2, 0, 1)
        if ret == STATUS_OK:
            print('调用 VCI_StartCAN2 成功\r\n')
        if ret != STATUS_OK:
            print('调用 VCI_StartCAN2 出错\r\n')

    def close_CAN(self):
        self.canDLL.VCI_CloseDevice(VCI_USBCAN2, 0)

    def send_data(self, port, data):
        ubyte_array = c_ubyte * 8
        ubyte_3array = c_ubyte * 3
        b = ubyte_3array(0, 0, 0)
        vci_can_obj = VCI_CAN_OBJ(0x141, 0, 0, 1, 0, 0, 8, data, b)  # 单次发送
        ret = self.canDLL.VCI_Transmit(VCI_USBCAN2, 0, port, byref(vci_can_obj), 1)
        # if ret == STATUS_OK:
        #     print('CAN1通道发送成功\r\n')
        if ret != STATUS_OK:
            print('CAN1通道发送失败\r\n')

    def receive_data(self, port):
        ubyte_array = c_ubyte * 8
        ubyte_3array = c_ubyte*3
        a = ubyte_array(0, 0, 0, 0, 0, 0, 0, 0)
        b = ubyte_3array(0, 0, 0)
        vci_can_obj = VCI_CAN_OBJ(0x141, 0, 0, 0, 0, 0, 0, a, b)  # 复位接收缓存
        ret = self.canDLL.VCI_Receive(VCI_USBCAN2, 0, port, byref(vci_can_obj), 2500, 0)
        i = 0
        while ret <= 0:  # 如果没有接收到数据，一直循环查询接收。
            time.sleep(0.0001)
            ret = self.canDLL.VCI_Receive(VCI_USBCAN2, 0, port, byref(vci_can_obj), 2500, 0)
            i = i + 1
            if i > 10000:
                break
        if ret > 0:  # 接收到一帧数据
            return vci_can_obj.Data
        return 0

    def stop_and_fix(self, port):
        self.send_data(port, (0x81, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00))

    def turn_off(self, port):
        self.send_data(port, (0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00))

    def get_degree(self, port):
        self.send_data(port, (0x94, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00))
        data = self.receive_data(port)
        lo = hex(data[6])
        hi = hex(data[7])
        degree_hex = '0x' + hi[2:] + lo[2:]
        degree = int(degree_hex, 16) / 100
        while degree > 360:
            degree = degree - 360
        # print("degree = ", degree)
        return int(degree)

    def system_reset(self, port):
        self.send_data(port, (0x76, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00))

    def set_degree_zero(self, port):
        self.send_data(port, (0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00))
        data = self.receive_data(port)
        print(data)
        self.system_reset(port)

    def set_degree(self, port, degree):
        degree_hex = str(hex(degree*100))[2:]
        # print(degree_hex)
        while len(degree_hex) < 4:
            degree_hex = '0' + degree_hex
        high = int('0x' + degree_hex[0:2], 16)
        low = int('0x' + degree_hex[2:], 16)
        print(high)
        print(low)
        self.send_data(port, (0xA6, 0x00, 0xF4, 0x01, 0xA0, 0x8C, 0x00, 0x00))

    def cw_rotate_1(self, port):
        self.send_data(port, (0xA8, 0x00, 0x64, 0x00, 0x64, 0x00, 0x00, 0x00))
        # time.sleep(0.01)

    def cw_rotate_0_1(self, port):
        self.send_data(port, (0xA8, 0x00, 0xF4, 0x01, 0x0A, 0x00, 0x00, 0x00))
        # time.sleep(0.01)


    def cw_rotate_any(self, port, degree):
        # 0号朝正前是0度
        # 1号朝正前是360度
        hexNums = int_transform_4hex(degree*100)
        high = int(hexNums[0:2], 16)
        low = int(hexNums[3:5], 16)
        self.send_data(port, (0xA8, 0x00, 0xF4, 0x01, low, high, 0x00, 0x00))
        time.sleep(0.01)

    def anticw_rotate_1(self, port):
        self.send_data(port, (0xA8, 0x00, 0x64, 0x00, 0x9C, 0xFF, 0xFF, 0xFF))
        # time.sleep(0.01)

    def anticw_rotate_0_1(self, port):
        self.send_data(port, (0xA8, 0x00, 0xF4, 0x01, 0xF6, 0xFF, 0xFF, 0xFF))
        # time.sleep(0.01)

    def get_relative_degree(self):
        self.curr_relative_0 = self.relative_zero_0 - self.get_degree(0)
        self.curr_relative_1 = self.get_degree(1) - self.relative_zero_1
        # print(self.curr_relative_0)
        # print(self.curr_relative_1)

    def goto_degree(self, target_0, target_1):
        self.canDLL.VCI_ClearBuffer(VCI_USBCAN2, 0, 0)
        self.canDLL.VCI_ClearBuffer(VCI_USBCAN2, 0, 1)
        diff_0 = target_0 - self.curr_relative_0
        if diff_0 > 100 or diff_0 < -100:
            print("Unstable value")
            return 0
        print("diff_0: ", diff_0)
        if diff_0 > 0:
            for i in range(0, diff_0):
                print("self.anticw_rotate_1(0)", i)
                self.anticw_rotate_1(0)
        if diff_0 < 0:
            for i in range(0, -diff_0):
                print("self.cw_rotate_1(0)", i)
                self.cw_rotate_1(0)

        diff_1 = target_1 - self.curr_relative_1
        if diff_1 > 100 or diff_1 < -100:
            print("Unstable value")
            return 0
        print("diff_1: ", diff_1)
        if diff_1 < 0:
            for i in range(0, -diff_1):
                print("self.anticw_rotate_1(1)", i)
                self.anticw_rotate_1(1)
        if diff_1 > 0:
            for i in range(0, diff_1):
                print("self.cw_rotate_1(1)", i)
                self.cw_rotate_1(1)

    def goto_definite_degree(self, port, target):
        self.canDLL.VCI_ClearBuffer(VCI_USBCAN2, 0, 0)
        self.canDLL.VCI_ClearBuffer(VCI_USBCAN2, 0, 1)
        # self.send_data(port, (0xA4, 0x00, 0xF4, 0x01, 0x28, 0x23, 0x00, 0x00))
        # self.send_data(port, (0xA4, 0x00, 0xF4, 0x01, 0xB8, 0x88, 0x00, 0x00))
        # 0号朝正前是0度
        # 1号朝正前是360度
        if port == 0:
            target = - target +360
        if port == 1:
            target = target + 360
        hexNums = int_transform_4hex(target * 100)
        high = int(hexNums[0:2], 16)
        low = int(hexNums[3:5], 16)
        self.send_data(port, (0xA4, 0x00, 0xF4, 0x01, low, high, 0x00, 0x00))

    def update_to_target(self):
        self.goto_definite_degree(0, self.target_degree[0])
        self.goto_definite_degree(1, self.target_degree[1])


    def keyboardControl(self, queue):
        cv2.namedWindow("keyboardControl", cv2.WINDOW_AUTOSIZE)
        cv2.moveWindow('keyboardControl', 100, 900)

        while True:
            try:
                cv2.namedWindow("keyboardControl", cv2.WINDOW_AUTOSIZE)
                image = np.zeros((480, 640, 3))
                degree_0 = self.get_degree(0)
                degree_1 = self.get_degree(1)
                self.get_relative_degree()
                if self.switch_go_to_degree:
                    self.update_to_target()
                    # self.goto_degree(self.target_degree[0], self.target_degree[1])
                cv2.putText(image, "degree_0(abs): " + str(degree_0), (10, 50), font_faces[0], 1.5, (255, 255, 255), 2,
                            cv2.LINE_AA)
                cv2.putText(image, "degree_1(abs): " + str(degree_1), (10, 100), font_faces[0], 1.5, (255, 255, 255), 2,
                            cv2.LINE_AA)
                cv2.putText(image, "degree_0(rel): " + str(self.curr_relative_0), (10, 150), font_faces[0], 1.5, (255, 255, 255), 2,
                            cv2.LINE_AA)
                cv2.putText(image, "degree_1(rel): " + str(self.curr_relative_1), (10, 200), font_faces[0], 1.5, (255, 255, 255), 2,
                            cv2.LINE_AA)
                cv2.putText(image, "Go to degree: " + str(self.switch_go_to_degree), (10, 300), font_faces[0], 1.5,
                            (255, 255, 255), 2,
                            cv2.LINE_AA)
                try:
                    new_message = queue.get_nowait()
                    if new_message != self.target_degree:
                        self.target_degree = new_message
                except Empty:
                    pass
                cv2.putText(image, str(self.target_degree), (10, 250), font_faces[0], 1.5, (255, 255, 255), 2, cv2.LINE_AA)

                cv2.imshow("keyboardControl", image)
                c = cv2.waitKey(1)
                if c == ord('s'):
                    self.cw_rotate_1(0)
                if c == ord('d'):
                    self.cw_rotate_1(1)
                if c == ord('w'):
                    self.anticw_rotate_1(0)
                if c == ord('a'):
                    self.anticw_rotate_1(1)
                if c == ord('f'):
                    self.turn_off(0)
                    self.turn_off(1)
                if c == ord('g'):
                    self.stop_and_fix(0)
                    self.stop_and_fix(1)
                if c == ord('r'):
                    self.get_degree(0)
                if c == ord('p'):
                    print("Getting relative zero position")
                    self.relative_zero_0 = 0
                    self.relative_zero_1 = 0
                    for i in range(0, 10):
                        self.relative_zero_0 = self.relative_zero_0 + self.get_degree(0)
                        self.relative_zero_1 = self.relative_zero_1 + self.get_degree(1)
                        time.sleep(0.01)
                    self.relative_zero_0 = int(self.relative_zero_0 / 10)
                    self.relative_zero_1 = int(self.relative_zero_1 / 10)
                    print(self.relative_zero_0)
                    print(self.relative_zero_1)
                if c == ord('c'):
                    self.switch_go_to_degree = not self.switch_go_to_degree
                if c == ord('z'):
                    self.cw_rotate_any(0, 10)
                if c == ord('m'):
                    self.goto_definite_degree(0, 0)
                    self.goto_definite_degree(1, 0)
                if c == 27:
                    break
                # time.sleep(0.005)
                self.canDLL.VCI_ClearBuffer(VCI_USBCAN2, 0, 0)
                self.canDLL.VCI_ClearBuffer(VCI_USBCAN2, 0, 1)
            except:
                print("Error!!!")
                cv2.destroyWindow("keyboardControl")
                # pass
        cv2.destroyWindow("keyboardControl")
