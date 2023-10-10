import express from "express";

express().use(express.static("../../")).listen(3000);
