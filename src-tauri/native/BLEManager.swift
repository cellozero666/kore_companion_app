import Foundation
import CoreBluetooth

@_silgen_name("ble_on_connected")
func ble_on_connected()
@_silgen_name("ble_on_disconnected")
func ble_on_disconnected()
@_silgen_name("ble_data_received_ffi")
func ble_data_received_ffi(cString: UnsafePointer<Int8>)

class BLEManager: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    static let shared = BLEManager()
    
    override init() {
        super.init()
        self.centralManager = CBCentralManager(delegate: self, queue: nil)
    }
    
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            print("[\(Date().timeIntervalSince1970)] BLEManager: Powered On, scanning...")
            central.scanForPeripherals(withServices: [serviceUUID], options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        default:
            print("[\(Date().timeIntervalSince1970)] BLEManager: State \(central.state)")
        }
    }
    
    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
        print("[\(Date().timeIntervalSince1970)] BLEManager: Discovered \(peripheral.name ?? "Unknown")")
        self.peripheral = peripheral
        peripheral.delegate = self
        central.stopScan()
        central.connect(peripheral, options: nil)
    }
    
    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        print("[\(Date().timeIntervalSince1970)] BLEManager: Connected to \(peripheral.name ?? "Unknown")")
        peripheral.discoverServices([serviceUUID])
        ble_on_connected()
    }
    
    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        print("[\(Date().timeIntervalSince1970)] BLEManager: Disconnected")
        isReady = false
        ble_on_disconnected()
        central.scanForPeripherals(withServices: [serviceUUID], options: nil)
    }
    
    private var centralManager: CBCentralManager!
    private var peripheral: CBPeripheral?
    private var rxCharacteristic: CBCharacteristic?
    private var isReady: Bool = false
    
    private let serviceUUID = CBUUID(string: "8C0F0001-5A8F-4E7E-9D43-92D67E4D0001")
    private let rxUUID = CBUUID(string: "8C0F0002-5A8F-4E7E-9D43-92D67E4D0001")
    private let txUUID = CBUUID(string: "8C0F0003-5A8F-4E7E-9D43-92D67E4D0001")
    
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let service = peripheral.services?.first(where: { $0.uuid == serviceUUID }) else { return }
        peripheral.discoverCharacteristics([rxUUID, txUUID], for: service)
    }
    
    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        rxCharacteristic = service.characteristics?.first(where: { $0.uuid == rxUUID })
        if let txCharacteristic = service.characteristics?.first(where: { $0.uuid == txUUID }) {
            peripheral.setNotifyValue(true, for: txCharacteristic)
            isReady = true 
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if let data = characteristic.value, let message = String(data: data, encoding: .utf8) {
            print("BLE -> Rust: \(message)")
            
            // Asynchronously emit response back to Rust/Frontend
            message.withCString { cStr in
                ble_data_received_ffi(cString: cStr)
            }
        }
    }
    
    func send(command: String) {
        guard isReady, let peripheral = peripheral, let characteristic = rxCharacteristic else {
            return
        }
        if let data = command.data(using: .utf8) {
            peripheral.writeValue(data, for: characteristic, type: .withResponse)
        }
    }
}

@_cdecl("init_ble_manager")
public func init_ble_manager() {
    _ = BLEManager.shared
}

@_cdecl("ble_send_command_native")
public func ble_send_command_native(command: UnsafePointer<CChar>) {
    let cmd = String(cString: command)
    BLEManager.shared.send(command: cmd)
}
