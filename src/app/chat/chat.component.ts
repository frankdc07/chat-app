import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';

import { Mensaje } from './models/mensaje';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {

  private client: Client;
  conectado: boolean = false;
  mensaje: Mensaje = new Mensaje();
  mensajes: Mensaje[] = [];
  escribiendo: string;
  clienteId: string;
  @ViewChild('scrollChat') scrollChat : ElementRef ;
  scrollTop: number = null;

  constructor() {
    this.clienteId = 'Id-' + new Date().getUTCMilliseconds() + '-' + Math.random().toString(36).substr(2);
  }

  ngOnInit(): void {
    this.client = new Client();
    this.client.webSocketFactory = () => {
      return new SockJS('http://localhost:8080/chat-websocket');
    }
    this.client.onConnect = (frame) => {
      console.log('Conectado: ' + this.client.connected + ' : ' + frame);
      this.conectado = true;
      this.client.subscribe('/chat/mensaje', event => {
        let mensaje: Mensaje = JSON.parse(event.body) as Mensaje;
        mensaje.fecha = new Date(mensaje.fecha);
        if (!this.mensaje.color && mensaje.tipo == 'NUEVO_USUARIO' && this.mensaje.username == mensaje.username) {
          this.mensaje.color = mensaje.color;
        }
        this.mensajes.push(mensaje);
        setTimeout(() => this.scrollTop = this.scrollChat.nativeElement.scrollHeight, 1);
      });
      this.client.subscribe('/chat/escribiendo', event => {
        this.escribiendo = event.body;
        //setTimeout(() => this.escribiendo = '', 3000);
      });
      this.mensaje.tipo = 'NUEVO_USUARIO'
      this.mensaje.color = '';
      this.client.publish({
        destination: '/app/mensaje',
        body: JSON.stringify(this.mensaje)
      });
      this.client.subscribe('/chat/historial/' + this.clienteId, event => {
        const historial = JSON.parse(event.body) as Mensaje[];
        let mensajeConectado: Mensaje = this.mensajes.pop();
        this.mensajes = historial.map(item =>{
          item.fecha = new Date(item.fecha);
          return item;
        }).reverse();
        this.mensajes.push(mensajeConectado);
        setTimeout(() => this.scrollTop = this.scrollChat.nativeElement.scrollHeight, 1000);
      });
      this.client.publish({
        destination: '/app/historial',
        body: this.clienteId
      });
    }
    this.client.onDisconnect = (frame) => {
      this.conectado = false;
    }
  }

  conectar(): void {
    this.client.activate();
  }

  desconectar(): void {
    this.mensaje.tipo = 'DESCONECTADO'
    this.client.publish({
      destination: '/app/mensaje',
      body: JSON.stringify(this.mensaje)
    });
    this.client.deactivate();
  }

  enviarMensaje(): void {
    this.mensaje.tipo = 'MENSAJE'
    this.client.publish({
      destination: '/app/mensaje',
      body: JSON.stringify(this.mensaje)
    });
    this.mensaje.texto = '';
    this.escribiendo = '';
  }

  escribiendoEvento(): void {
    this.client.publish({
      destination: '/app/escribiendo',
      body: JSON.stringify(this.mensaje)
    });
  }

}
